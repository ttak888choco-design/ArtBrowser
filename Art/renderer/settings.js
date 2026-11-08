// settings.js - 設定ページのロジック

// セクション切り替え
const sectionButtons = document.querySelectorAll('.section-btn');
const sectionPanels = document.querySelectorAll('.section-panel');

sectionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const sectionId = btn.dataset.section;
        sectionButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        sectionPanels.forEach(panel => {
            panel.classList.remove('active');
            if (panel.id === `section-${sectionId}`) {
                panel.classList.add('active');
            }
        });
    });
});

// ===========================
// 親ウィンドウへの通知関数
// ===========================
function notifyParent(type, value) {
    // ipc.sendToHostが使える場合（webview内でpreloadが有効な場合）
    if (window.ipc && window.ipc.sendToHost) {
        window.ipc.sendToHost('settings-changed', { type, value });
    }
    // フォールバック: postMessageを使用
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'settings-changed', setting: type, value }, '*');
    }
    // さらにフォールバック: URLハッシュを変更
    // オブジェクトの場合はJSONエンコードして送信
    const encodedValue = typeof value === 'object' ? encodeURIComponent(JSON.stringify(value)) : value;
    window.location.hash = `${type}=${encodedValue}&t=${Date.now()}`;
}

// ===========================
// アイケアモード（カスタムプルダウン式）
// ===========================
const eyecareSelectWrapper = document.querySelector('.custom-select');

function loadEyecareSetting() {
    const savedMode = localStorage.getItem('eyecareMode') || 'off';
    if (eyecareSelectWrapper) {
        const options = eyecareSelectWrapper.querySelectorAll('.custom-option');
        options.forEach(option => {
            if (option.dataset.value === savedMode) {
                option.classList.add('selected');
                eyecareSelectWrapper.querySelector('.selected-text').textContent = option.textContent;
            } else {
                option.classList.remove('selected');
            }
        });
    }
}

if (eyecareSelectWrapper) {
    const trigger = eyecareSelectWrapper.querySelector('.custom-select-trigger');

    // トグル作成
    trigger.addEventListener('click', () => {
        eyecareSelectWrapper.classList.toggle('open');
    });

    // オプション選択
    const options = eyecareSelectWrapper.querySelectorAll('.custom-option');
    options.forEach(option => {
        option.addEventListener('click', () => {
            if (!option.classList.contains('selected')) {
                // UI更新
                eyecareSelectWrapper.querySelector('.custom-option.selected').classList.remove('selected');
                option.classList.add('selected');
                eyecareSelectWrapper.querySelector('.selected-text').textContent = option.textContent;
                eyecareSelectWrapper.classList.remove('open');

                // 値の変更処理
                const mode = option.dataset.value;
                console.log('アイケアモード変更:', mode);
                localStorage.setItem('eyecareMode', mode);
                notifyParent('eyecare', mode);
            } else {
                eyecareSelectWrapper.classList.remove('open');
            }
        });
    });

    // 外側クリックで閉じる
    window.addEventListener('click', (e) => {
        if (!eyecareSelectWrapper.contains(e.target)) {
            eyecareSelectWrapper.classList.remove('open');
        }
    });
}

// ===========================
// 色覚補正フィルター
// ===========================
const colorVisionButtons = document.querySelectorAll('.color-vision-btn');

function loadColorVisionSetting() {
    const savedFilter = localStorage.getItem('colorVisionFilter') || 'none';
    const customFilter = localStorage.getItem('customColorFilter');

    colorVisionButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === savedFilter && !customFilter);
    });

    // フィルター状態表示を更新
    updateFilterStatus();
}

function updateFilterStatus() {
    const statusEl = document.getElementById('current-filter-name');
    if (!statusEl) return;

    const customFilter = localStorage.getItem('customColorFilter');
    if (customFilter) {
        const data = JSON.parse(customFilter);
        statusEl.textContent = `カスタム (${data.typeName}, 強度${Math.round(data.severity * 100)}%)`;
    } else {
        const filter = localStorage.getItem('colorVisionFilter') || 'none';
        const names = { none: 'なし', protanopia: '1型色覚', deuteranopia: '2型色覚', tritanopia: '3型色覚' };
        statusEl.textContent = names[filter] || 'なし';
    }
}

colorVisionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const filterType = btn.dataset.filter;
        colorVisionButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        localStorage.setItem('colorVisionFilter', filterType);
        localStorage.removeItem('customColorFilter'); // カスタムをクリア
        notifyParent('filter', filterType);
        updateFilterStatus();
    });
});

// ===========================
// スライダー彩度調整テスト（6ステップ）
// ===========================
const diagnosisModal = document.getElementById('diagnosis-modal');
const startDiagnosisBtn = document.getElementById('start-diagnosis');
const closeDiagnosisBtn = document.getElementById('close-diagnosis');
const clearFilterBtn = document.getElementById('clear-filter');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const stepLabel = document.getElementById('step-label');
const testCanvas = document.getElementById('test-canvas');
const saturateSlider = document.getElementById('saturate-slider');
const saturateValue = document.getElementById('saturate-value');
const confirmBtn = document.getElementById('confirm-step');

// ===========================
// Lab <-> RGB カラー空間変換用ユーティリティ
// ===========================
function labToRgb(l, a, b) {
    let y = (l + 16) / 116;
    let x = a / 500 + y;
    let z = y - b / 200;

    const xyzMap = (v) => {
        const v3 = v * v * v;
        return v3 > 0.008856 ? v3 : (v - 16 / 116) / 7.787;
    };
    x = 95.047 * xyzMap(x);
    y = 100.000 * xyzMap(y);
    z = 108.883 * xyzMap(z);

    let r = x * 0.032406 + y * -0.015372 + z * -0.004986;
    let g = x * -0.009689 + y * 0.018758 + z * 0.000415;
    let b_ = x * 0.000557 + y * -0.002040 + z * 0.010570;

    const rgbMap = (v) => v > 0.0031308 ? 1.055 * Math.pow(v, 1 / 2.4) - 0.055 : 12.92 * v;
    r = Math.max(0, Math.min(1, rgbMap(r))) * 255;
    g = Math.max(0, Math.min(1, rgbMap(g))) * 255;
    b_ = Math.max(0, Math.min(1, rgbMap(b_))) * 255;

    return [Math.round(r), Math.round(g), Math.round(b_)];
}

// ===========================
// Lab・DeltaE ベース色覚テスト
// ===========================

// 6ステップのハイブリッドテスト定義
const testSteps = [
    // 前半: Lab空間上でのDeltaE測定
    { type: 'deltaE', label: '緑系', baseLab: { l: 60, a: -30, b: 20 }, axis: 'a', axisDir: 1 },
    { type: 'deltaE', label: '赤系', baseLab: { l: 60, a: 40, b: 20 }, axis: 'a', axisDir: -1 },
    { type: 'deltaE', label: '青系', baseLab: { l: 60, a: 0, b: -30 }, axis: 'b', axisDir: 1 },
    // 後半: 色覚異常の混同色判定（RGBスライダー）
    { type: 'slider', label: '1型色覚が見分けにくい色', bgColor: { r: 110, g: 100, b: 75 }, textColor: { r: 100, g: 115, b: 80 } },
    { type: 'slider', label: '2型色覚が見分けにくい色', bgColor: { r: 105, g: 110, b: 70 }, textColor: { r: 85, g: 120, b: 75 } },
    { type: 'slider', label: '3型色覚が見分けにくい色', bgColor: { r: 80, g: 105, b: 120 }, textColor: { r: 85, g: 95, b: 130 } }
];

let currentStep = 0;
let currentDeltaE = 2.2;
let testResults = [];

function drawDeltaETestImage(stepIndex) {
    const canvas = document.getElementById('test-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const step = testSteps[stepIndex];

    const bgLab = step.baseLab;
    let txLab = { l: bgLab.l, a: bgLab.a, b: bgLab.b };

    if (step.axis === 'a') txLab.a += currentDeltaE * step.axisDir;
    if (step.axis === 'b') txLab.b += currentDeltaE * step.axisDir;

    const bgRgb = labToRgb(bgLab.l, bgLab.a, bgLab.b);
    const txRgb = labToRgb(txLab.l, txLab.a, txLab.b);

    ctx.fillStyle = `rgb(${bgRgb[0]}, ${bgRgb[1]}, ${bgRgb[2]})`;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = `rgb(${txRgb[0]}, ${txRgb[1]}, ${txRgb[2]})`;
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('テ キ ス ト', w / 2, h / 2);
}

function clamp(v) {
    return Math.max(0, Math.min(255, Math.round(v)));
}

function drawSliderTestImage(stepIndex, saturationPercent) {
    const canvas = document.getElementById('test-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const step = testSteps[stepIndex];
    const satFactor = saturationPercent / 100;

    const bgGray = 0.2126 * step.bgColor.r + 0.7152 * step.bgColor.g + 0.0722 * step.bgColor.b;
    const bgR = clamp(bgGray + (step.bgColor.r - bgGray) * satFactor);
    const bgG = clamp(bgGray + (step.bgColor.g - bgGray) * satFactor);
    const bgB = clamp(bgGray + (step.bgColor.b - bgGray) * satFactor);

    const txGray = 0.2126 * step.textColor.r + 0.7152 * step.textColor.g + 0.0722 * step.textColor.b;
    const txR = clamp(txGray + (step.textColor.r - txGray) * satFactor);
    const txG = clamp(txGray + (step.textColor.g - txGray) * satFactor);
    const txB = clamp(txGray + (step.textColor.b - txGray) * satFactor);

    ctx.fillStyle = `rgb(${bgR}, ${bgG}, ${bgB})`;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = `rgb(${txR}, ${txG}, ${txB})`;
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('テ キ ス ト', w / 2, h / 2);
}

function showStep(stepIndex) {
    currentStep = stepIndex;
    const step = testSteps[stepIndex];

    const _stepLabel = document.getElementById('step-label');
    const _stepInstruction = document.getElementById('step-instruction');
    const _progressFill = document.getElementById('progress-fill');
    const _progressText = document.getElementById('progress-text');

    if (_stepLabel) _stepLabel.textContent = `${step.label} (${stepIndex + 1} / 6)`;
    if (_progressFill) _progressFill.style.width = `${((stepIndex + 1) / testSteps.length) * 100}%`;
    if (_progressText) _progressText.textContent = `${stepIndex + 1} / ${testSteps.length}`;

    const deltaEUI = document.getElementById('delta-e-ui');
    const sliderUI = document.getElementById('slider-ui');

    if (step.type === 'deltaE') {
        deltaEUI.style.display = 'block';
        sliderUI.style.display = 'none';
        if (_stepInstruction) _stepInstruction.textContent = '中心の文字（テキスト）が読めますか？';

        currentDeltaE = 2.3;
        const _deltaEValue = document.getElementById('delta-e-value');
        const _deltaESlider = document.getElementById('delta-e-slider');
        const _confirmDeltaE = document.getElementById('confirm-delta-e');

        if (_deltaEValue) _deltaEValue.textContent = currentDeltaE.toFixed(1);

        if (_deltaESlider) {
            _deltaESlider.value = 2.2;
            _deltaESlider.oninput = () => {
                currentDeltaE = parseFloat(_deltaESlider.value);
                if (_deltaEValue) _deltaEValue.textContent = currentDeltaE.toFixed(1);
                drawDeltaETestImage(currentStep);
            };
        }

        if (_confirmDeltaE) {
            _confirmDeltaE.onclick = () => {
                testResults.push(currentDeltaE);
                showStep(currentStep + 1);
            };
        }
        drawDeltaETestImage(stepIndex);

    } else {
        deltaEUI.style.display = 'none';
        sliderUI.style.display = 'block';
        if (_stepInstruction) _stepInstruction.textContent = '見やすいと感じる彩度に調整してください';

        const _slider = document.getElementById('saturate-slider');
        const _satValue = document.getElementById('saturate-value');
        const _confirmBtn = document.getElementById('confirm-step');

        if (_slider) {
            _slider.value = 100;
            _slider.oninput = () => {
                const val = parseInt(_slider.value);
                if (_satValue) _satValue.textContent = val;
                drawSliderTestImage(stepIndex, val);
            };
        }
        if (_satValue) _satValue.textContent = '100';

        if (_confirmBtn) {
            _confirmBtn.onclick = () => {
                const val = parseInt(document.getElementById('saturate-slider').value);
                testResults.push(val);
                if (currentStep < testSteps.length - 1) {
                    showStep(currentStep + 1);
                } else {
                    showTestResult();
                }
            };
        }
        drawSliderTestImage(stepIndex, 100);
    }
}

function showTestResult() {
    const analysis = analyzeResults();
    const panel = diagnosisModal.querySelector('.diagnosis-glass-panel');
    if (!panel) return;

    const dG = analysis.deltaEFactors ? (analysis.deltaEFactors.g * 100).toFixed(0) : '0';
    const dR = analysis.deltaEFactors ? (analysis.deltaEFactors.r * 100).toFixed(0) : '0';
    const dB = analysis.deltaEFactors ? (analysis.deltaEFactors.b * 100).toFixed(0) : '0';

    panel.innerHTML = `
        <div class="diagnosis-header">
            <h2>診断結果</h2>
            <button class="close-modal" id="close-result">×</button>
        </div>
        <div class="result-container">
            <p class="result-title">あなたの色覚プロファイル</p>
            <p class="result-type">${analysis.typeName}</p>
            <p class="result-severity">
                識別限界 ΔE:<br>
                <span style="color:#7f7;">緑: ${testResults[0].toFixed(1)}</span> /
                <span style="color:#f77;">赤: ${testResults[1].toFixed(1)}</span> /
                <span style="color:#77f;">青: ${testResults[2].toFixed(1)}</span><br>
                <span style="font-size: 12px; opacity: 0.7;">色別彩度強調: 緑+${dG}% / 赤+${dR}% / 青+${dB}%</span>
            </p>
        </div>
        <button class="apply-result-btn" id="apply-result">このフィルターを適用</button>
    `;

    document.getElementById('close-result').onclick = () => {
        diagnosisModal.classList.remove('active');
    };

    document.getElementById('apply-result').onclick = () => {
        applyCustomFilter(analysis);
    };
}

function analyzeResults() {
    // testResults反映
    const greenDeltaE = testResults[0] || 2.2;
    const redDeltaE = testResults[1] || 2.2;
    const blueDeltaE = testResults[2] || 2.2;
    const BASE_DELTA_E = 2.3;
    const SCALE = 0.06; // スケーリング係数（あとで変更する、低すぎるかも）
    const deltaEFactors = {
        g: Math.max(0, (greenDeltaE - BASE_DELTA_E) * SCALE),
        r: Math.max(0, (redDeltaE - BASE_DELTA_E) * SCALE),
        b: Math.max(0, (blueDeltaE - BASE_DELTA_E) * SCALE)
    };
    const protanSat = testResults[3];
    const deutanSat = testResults[4];
    const tritanSat = testResults[5];

    let baseType = 'none';
    let typeName = '標準色覚';

    const maxConfusion = Math.max(protanSat, deutanSat, tritanSat);

    if (maxConfusion > 110) {
        if (maxConfusion === protanSat) {
            baseType = 'protanopia';
            typeName = '1型色覚特性（赤調整推奨）';
        } else if (maxConfusion === deutanSat) {
            baseType = 'deuteranopia';
            typeName = '2型色覚特性（緑調整推奨）';
        } else {
            baseType = 'tritanopia';
            typeName = '3型色覚特性（青調整推奨）';
        }
    }

    const avgConfusion = (protanSat + deutanSat + tritanSat) / 3;
    const saturateVal = Math.max(100, Math.min(200, Math.floor(avgConfusion * 0.8 + 20)));
    const contrastVal = avgConfusion > 120 ? 110 : 100;

    return {
        type: 'custom',
        typeName: typeName,
        baseType: baseType,
        saturate: Math.round(saturateVal),
        contrast: Math.round(contrastVal),
        severity: maxConfusion > 100 ? (maxConfusion - 100) / 100 : 0,
        deltaEFactors: deltaEFactors,
        rawResults: [...testResults]
    };
}

// フィルター
function applyCustomFilter(analysis) {
    const filterData = {
        type: analysis.type,
        typeName: analysis.typeName,
        baseType: analysis.baseType,
        saturate: analysis.saturate,
        contrast: analysis.contrast,
        severity: analysis.severity,
        deltaEFactors: analysis.deltaEFactors,
        rawResults: analysis.rawResults
    };

    localStorage.setItem('customColorFilter', JSON.stringify(filterData));
    localStorage.setItem('colorVisionFilter', 'custom');
    notifyParent('customFilter', filterData);

    colorVisionButtons.forEach(b => b.classList.remove('active'));
    updateFilterStatus();
    diagnosisModal.classList.remove('active');
}

// スライダー
if (saturateSlider) {
    saturateSlider.addEventListener('input', () => {
        const val = parseInt(saturateSlider.value);
        if (saturateValue) saturateValue.textContent = val;
        drawTestImage(currentStep, val);
    });
}

// ボタン
if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
        const val = parseInt(saturateSlider.value);
        testResults.push(val);

        if (currentStep < testSteps.length - 1) {
            showStep(currentStep + 1);
        } else {
            showTestResult();
        }
    });
}

// リセット
if (clearFilterBtn) {
    clearFilterBtn.addEventListener('click', () => {
        localStorage.removeItem('customColorFilter');
        localStorage.setItem('colorVisionFilter', 'none');
        colorVisionButtons.forEach(b => {
            b.classList.toggle('active', b.dataset.filter === 'none');
        });
        notifyParent('filter', 'none');
        updateFilterStatus();
    });
}

const glassPanelOriginalHTML = document.querySelector('.diagnosis-glass-panel')
    ? document.querySelector('.diagnosis-glass-panel').innerHTML
    : '';

if (startDiagnosisBtn) {
    startDiagnosisBtn.addEventListener('click', () => {
        currentStep = 0;
        testResults = [];
        const panel = document.querySelector('.diagnosis-glass-panel');
        if (panel && glassPanelOriginalHTML) {
            panel.innerHTML = glassPanelOriginalHTML;
        }

        diagnosisModal.classList.add('active');
        showStep(0);
    });
}

if (closeDiagnosisBtn) {
    closeDiagnosisBtn.addEventListener('click', () => {
        diagnosisModal.classList.remove('active');
    });
}

// APIキー設定 (暫定)
async function loadApiKeySetting() {
    try {
        const key = await window.electronAPI.getSetting('geminiApiKey');
        if (key) {
            document.getElementById('gemini-api-key-input').value = key;
        }
    } catch (e) {
        console.error('APIキー読み込みエラー:', e);
    }
}

const saveApiKeyBtn = document.getElementById('save-api-key-btn');
if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', async () => {
        const key = document.getElementById('gemini-api-key-input').value.trim();
        await window.electronAPI.setSetting('geminiApiKey', key);
        const status = document.getElementById('api-key-save-status');
        if (status) {
            status.style.display = 'block';
            setTimeout(() => {
                status.style.display = 'none';
            }, 3000);
        }
    });
}

// 設定を復元
document.addEventListener('DOMContentLoaded', () => {
    loadEyecareSetting();
    loadColorVisionSetting();
    loadApiKeySetting();
});
