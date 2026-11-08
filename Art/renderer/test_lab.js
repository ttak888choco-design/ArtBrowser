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

console.log("bg green:", labToRgb(60, -30, 20));
console.log("de 2.2 :", labToRgb(60, -30 + 2.2, 20));
console.log("de 5.0 :", labToRgb(60, -30 + 5.0, 20));

console.log("bg red:  ", labToRgb(60, 40, 20));
console.log("de 2.2 :", labToRgb(60, 40 - 2.2, 20));

