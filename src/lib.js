import { toRaw, isRef, unref } from "vue";
import errors from "./errors.json";

export function makeDonut(
    item,
    cx,
    cy,
    rx,
    ry,
    piProportion = 1.99999,
    piMult = 2,
    arcAmpl = 1.45,
    degrees = 360,
    rotation = 105.25,
    size = 0
) {
    const { series } = item;
    if (!series || series.length === 0) {
        return [];
    }

    const sum = series.reduce((total, s) => total + s.value, 0);

    const ratios = [];
    let acc = 0;

    for (let i = 0; i < series.length; i++) {
        const rawVal = series[i].value;
        const isSingle = series.length === 1;

        // Force 360° when single datapoint
        const proportion = isSingle ? 1 : sum > 0 ? rawVal / sum : 0;
        const ratio = proportion * (Math.PI * piProportion);
        const midProportion = isSingle ? 0.5 : sum > 0 ? (rawVal / 2) / sum : 0.5;
        const midRatio = midProportion * (Math.PI * piMult);
        const { startX, startY, endX, endY, path } = createArc(
            [cx, cy],
            [rx, ry],
            [acc, ratio],
            rotation,
            degrees,
            piMult
        );
        const inner = createArc(
            [cx, cy],
            [rx - size, ry - size],
            [acc, ratio],
            rotation,
            degrees,
            piMult,
            true
        );
        const center = createArc(
            [cx, cy],
            [rx * arcAmpl, ry * arcAmpl],
            [acc, midRatio],
            rotation,
            degrees,
            piMult
        );
        ratios.push({
            arcSlice: `${path} L ${inner.startX} ${inner.startY} ${inner.path} L ${startX} ${startY}`,
            cx: checkNaN(cx),
            cy: checkNaN(cy),
            ...series[i],
            proportion: checkNaN(proportion),
            ratio: checkNaN(ratio),
            path: path.replaceAll("NaN", "0"),
            startX: checkNaN(startX),
            startY: checkNaN(startY),
            endX: checkNaN(endX),
            endY: checkNaN(endY),
            separator: {
                x: inner.startX,
                y: inner.startY,
            },
            firstSeparator: {
                x: Number(inner.path.split(" ").at(-2)),
                y: Number(inner.path.split(" ").at(-1)),
            },
            center,
        });
        acc += ratio;
    }
    return ratios;
}

export function addVector([a1, a2], [b1, b2]) {
    return [a1 + b1, a2 + b2];
}

export function matrixTimes([[a, b], [c, d]], [x, y]) {
    return [a * x + b * y, c * x + d * y];
}

export function rotateMatrix(x) {
    return [
        [Math.cos(x), -Math.sin(x)],
        [Math.sin(x), Math.cos(x)],
    ];
}

export function createArc([cx, cy], [rx, ry], [position, ratio], phi, degrees = 360, piMult = 2, reverse = false) {
    ratio = ratio % (piMult * Math.PI);
    const rotMatrix = rotateMatrix(phi);
    const [sX, sY] = addVector(
        matrixTimes(rotMatrix, [
            rx * Math.cos(position),
            ry * Math.sin(position),
        ]),
        [cx, cy]
    );
    const [eX, eY] = addVector(
        matrixTimes(rotMatrix, [
            rx * Math.cos(position + ratio),
            ry * Math.sin(position + ratio),
        ]),
        [cx, cy]
    );
    const fA = ratio > Math.PI ? 1 : 0;
    const fS = ratio > 0 ? reverse ? 0 : 1 : reverse ? 1 : 0;
    return {
        startX: reverse ? checkNaN(eX) : checkNaN(sX),
        startY: reverse ? checkNaN(eY) : checkNaN(sY),
        endX: reverse ? checkNaN(sX) : checkNaN(eX),
        endY: reverse ? checkNaN(sY) : checkNaN(eY),
        path: `M${reverse ? checkNaN(eX) : checkNaN(sX)} ${reverse ? checkNaN(eY) : checkNaN(sY)} A ${[
            checkNaN(rx),
            checkNaN(ry),
            checkNaN((phi / (piMult * Math.PI)) * degrees),
            checkNaN(fA),
            checkNaN(fS),
            reverse ? checkNaN(sX) : checkNaN(eX),
            reverse ? checkNaN(sY) : checkNaN(eY),
        ].join(" ")}`,
    };
}

export function treeShake({ defaultConfig, userConfig }) {
    const finalConfig = { ...defaultConfig };

    Object.keys(finalConfig).forEach(key => {
        if (Object.hasOwn(userConfig, key)) {
            const currentVal = userConfig[key]
            if (currentVal === null) {
                finalConfig[key] = null;
            } else if (['boolean', 'function'].includes(typeof currentVal)) {
                finalConfig[key] = currentVal;
            } else if (["string", "number"].includes(typeof currentVal)) {
                if (isValidUserValue(currentVal)) {
                    finalConfig[key] = currentVal;
                }
            } else if (Array.isArray(finalConfig[key])) {
                if (checkArray({ userConfig, key })) {
                    finalConfig[key] = currentVal;
                }
            } else if (checkObj({ userConfig, key })) {
                finalConfig[key] = treeShake({
                    defaultConfig: finalConfig[key],
                    userConfig: currentVal
                });
            }
        }
    });

    // Allow override of default empty objects in config
    Object.keys(userConfig).forEach(key => {
        if (!Object.hasOwn(finalConfig, key)) {
            const val = userConfig[key];
            finalConfig[key] = (val && typeof val === 'object' && !Array.isArray(val))
                ? { ...val }
                : val;
        }
    });

    return finalConfig;
}

export function checkArray({ userConfig, key }) {
    return Object.hasOwn(userConfig, key) && Array.isArray(userConfig[key]) && userConfig[key].length >= 0;
}

export function checkObj({ userConfig, key }) {
    return Object.hasOwn(userConfig, key) && !Array.isArray(userConfig[key]) && typeof userConfig[key] === "object";
}

export function isValidUserValue(val) {
    return ![null, undefined, NaN, Infinity, -Infinity].includes(val);
}

export function isSafeValue(val) {
    return ![undefined, NaN, Infinity, -Infinity].includes(val)
}

export function forceValidValue(val, fallback = 0) {
    return isValidUserValue(val) ? val : fallback;
}

export function checkNaN(val, fallback = 0) {
    if (isNaN(val)) {
        return fallback
    } else {
        return val
    }
}

export const palette = [
    "#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c",
    "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5",
    "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f",
    "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5",
    "#393b79", "#5254a3", "#6b6ecf", "#9c9ede", "#637939",
    "#8ca252", "#b5cf6b", "#cedb9c", "#8c6d31", "#bd9e39",
    "#e7ba52", "#e7cb94", "#843c39", "#ad494a", "#d6616b",
    "#e7969c", "#7b4173", "#a55194", "#ce6dbd", "#de9ed6"
];

export function getPalette(palette = 'default') {
    switch (palette) {
        case 'hack':
            return themePalettes.hack;

        case 'zen':
            return themePalettes.zen;

        case 'concrete':
            return themePalettes.concrete;

        case 'celebration':
            return themePalettes.celebration;

        case 'celebrationNight':
            return themePalettes.celebrationNight;

        default:
            return themePalettes.default;
    }
}

export const themePalettes = {
    default: palette,
    celebration: [
        "#D32F2F",
        "#E64A19",
        "#F57C00",
        "#FF9800",
        "#FF5722",
        "#FFC107",
        "#FFEB3B",
        "#FFD54F",
        "#FF6F00",
        "#D84315",
        "#BF360C",
        "#C62828",
        "#B71C1C",
        "#FF7043",
        "#FF8A65",
        "#FFB74D",
        "#FFA726",
        "#FFCC80",
        "#FFE082",
        "#FFECB3"
    ],
    celebrationNight: [
        "#D32F2F",
        "#E64A19",
        "#F57C00",
        "#FF9800",
        "#FF5722",
        "#FFC947",
        "#FFEB3B",
        "#FFD95B",
        "#FF8800",
        "#FF5722",
        "#DD2C00",
        "#F44336",
        "#C62828",
        "#FF6E6E",
        "#FF867C",
        "#FFB547",
        "#FFA837",
        "#FFD180",
        "#FFE57F",
        "#FFF59D"
    ],
    concrete: [
        "#4A6A75",
        "#6C94A0",
        "#7DA9B5",
        "#8EBFCA",
        "#9FD4E0",
        "#B0E9F5",
        "#C1FFFF",
        "#5C6B5B",
        "#6D7D6D",
        "#7E8F7E",
        "#8FA290",
        "#A1B5A3",
        "#B2C7B5",
        "#C3DAC8",
        "#D4ECDA",
        "#E6FFF0",
        "#8A9CA5",
        "#9AA7B0",
        "#ABB1BC",
        "#BBCBC7",
        "#CCD6D3",
        "#DEE1DE",
        "#EFECEC",
        "#404C4D",
        "#50605F",
        "#617472",
        "#718885",
        "#829C98",
        "#92B0AB",
        "#A3C4BE",
        "#B3D8D2",
        "#C4EDE5",
        "#D4F1E8",
        "#404C5A",
        "#50606C",
        "#61747E",
        "#718890",
        "#829CA2",
        "#92B0B5"
    ],
    hack: [
        "#004C00",
        "#006600",
        "#008000",
        "#009900",
        "#00B300",
        "#00CC00",
        "#00E600",
        "#00FF00",
        "#33FF33",
        "#33E633",
        "#33CC33",
        "#33B333",
        "#339933",
        "#338033",
        "#336633",
        "#334C33",
        "#333333",
        "#00AF19",
        "#19E619",
        "#19CC19",
        "#19B319",
        "#199919",
        "#198019",
        "#196619",
        "#194C19",
        "#193319",
        "#191919",
        "#66FF66",
        "#66E666",
        "#66CC66",
        "#66B366",
        "#669966",
        "#668066",
        "#666666",
        "#4CFF4C",
        "#4CE64C",
        "#4CCC4C",
        "#4CB34C"
    ],
    zen: [
        "#B9B99D",
        "#E0CFC3",
        "#DFCA99",
        "#DCB482",
        "#C09E85",
        "#8F837A",
        "#858480",
        "#B0B9A8",
        "#606C5A",
        "#5E5E5E",
        "#4F5B75",
        "#647393",
        "#818EA9",
        "#9FA9BE",
        "#BBC4D3",
        "#DCDFE7",
        "#928A98",
        "#8A9892",
        "#B1A7AD",
        "#C5B8A7",
        "#EBD6CC",
        "#D7E0D2",
        "#E0D2D7",
        "#E0DBD2",
        "#D2E0DB",
        "#DBD2E0",
        "#C1B7A5",
        "#A5AFC1",
        "#E0DBD2",
        "#D2D7E0",
        "#F7EDE2",
        "#97ACB7",
        "#C4CBBC",
        "#C3C5C5",
        "#A0AC94"
    ]
};

export const opacity = ["00", "03", "05", "08", "0A", "0D", "0F", "12", "14", "17", "1A", "1C", "1F", "21", "24", "26", "29", "2B", "2E", "30", "33", "36", "38", "3B", "3D", "40", "42", "45", "47", "4A", "4D", "4F", "52", "54", "57", "59", "5C", "5E", "61", "63", "66", "69", "6B", "6E", "70", "73", "75", "78", "7A", "7D", "80", "82", "85", "87", "8A", "8C", "8F", "91", "94", "96", "99", "9C", "9E", "A1", "A3", "A6", "A8", "AB", "AD", "B0", "B3", "B5", "B8", "BA", "BD", "BF", "C2", "C4", "C7", "C9", "CC", "CF", "D1", "D4", "D6", "D9", "DB", "DE", "E0", "E3", "E6", "E8", "EB", "ED", "F0", "F2", "F5", "F7", "FA", "FC", "FF"];


export function convertColorToHex(color) {
    const hexRegex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i;
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])([a-f\d])?$/i;
    const rgbRegex = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/i;
    const hslRegex = /^hsla?\((\d+),\s*([\d.]+)%,\s*([\d.]+)%(?:,\s*([\d.]+))?\)$/i;

    if (color === undefined || color === null || (typeof color === 'number' && isNaN(color))) {
        return null;
    }

    color = isRef?.(color) ? unref(color) : color;

    color = convertNameColorToHex(color);


    if (Array.isArray(color)) {
        const [r, g, b, a = 1] = color;
        color = `rgba(${r},${g},${b},${a})`;
    } else if (typeof color === 'object') {
        if (Number.isFinite(color.r) && Number.isFinite(color.g) && Number.isFinite(color.b)) {
            const a = Number.isFinite(color.a) ? color.a : 1;
            color = `rgba(${color.r},${color.g},${color.b},${a})`;
        } else {
            return null;
        }
    } else if (typeof color === 'number') {
        const n = color >>> 0; // uint32
        const hex = n.toString(16).padStart(n <= 0xFFFFFF ? 6 : 8, '0');
        return `#${hex.length === 6 ? hex + 'ff' : hex}`;
    } else if (typeof color !== 'string') {
        return null;
    }

    color = color.trim();

    if (color.toLowerCase() === 'transparent') {
        return '#FFFFFF00';
    }

    color = color.replace(shorthandRegex, (_, r, g, b, a) => {
        return `#${r}${r}${g}${g}${b}${b}${a ? a + a : ''}`;
    });

    let match;
    let alpha = 1;

    if ((match = color.match(hexRegex))) {
        const [, r, g, b, a] = match;
        alpha = a ? parseInt(a, 16) / 255 : 1;
        return `#${r}${g}${b}${decimalToHex(Math.round(alpha * 255))}`;
    } else if ((match = color.match(rgbRegex))) {
        const [, r, g, b, a] = match;
        alpha = a ? parseFloat(a) : 1;
        return `#${decimalToHex(r)}${decimalToHex(g)}${decimalToHex(b)}${decimalToHex(Math.round(alpha * 255))}`;
    } else if ((match = color.match(hslRegex))) {
        const [, h, s, l, a] = match;
        alpha = a ? parseFloat(a) : 1;
        const [rr, gg, bb] = hslToRgba(Number(h), Number(s), Number(l));
        return `#${decimalToHex(rr)}${decimalToHex(gg)}${decimalToHex(bb)}${decimalToHex(Math.round(alpha * 255))}`;
    }

    return null;
}


export function decimalToHex(decimal) {
    const hex = Number(decimal).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
}

export function hslToRgba(h, s, l, alpha = 1) {
    h /= 360;
    s /= 100;
    l /= 100;

    let r, g, b;

    if (s === 0) {
        r = g = b = l; // Achromatic (gray)
    } else {
        const hueToRgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hueToRgb(p, q, h + 1 / 3);
        g = hueToRgb(p, q, h);
        b = hueToRgb(p, q, h - 1 / 3);
    }

    return [
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255),
        alpha,
    ];
}

export function shiftHue(hexColor, shiftAmount) {

    const nakedHex = hexColor.length === 9 ? hexColor.substring(0, 7) : hexColor;
    const alphaChannel = hexColor.length === 9 ? hexColor.substring(7, 9) : null;

    const hexToRgb = (hex) => ({
        r: parseInt(hex.substring(1, 3), 16),
        g: parseInt(hex.substring(3, 5), 16),
        b: parseInt(hex.substring(5, 7), 16),
    });

    const rgbToHsl = ({ r, g, b }) => {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h, s, l };
    };

    const hslToRgb = ({ h, s, l }) => {
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255),
        };
    };

    const rgbColor = hexToRgb(nakedHex || "#000000");
    const hslColor = rgbToHsl(rgbColor);
    hslColor.h += shiftAmount;
    hslColor.h = (hslColor.h + 1) % 1;

    const shiftedRgbColor = hslToRgb(hslColor);
    const shiftedHexColor = `#${(shiftedRgbColor.r << 16 | shiftedRgbColor.g << 8 | shiftedRgbColor.b).toString(16).padStart(6, '0')}`;


    return shiftedHexColor + (alphaChannel || '');
}


export function calcPolygonPoints({
    centerX,
    centerY,
    outerPoints,
    radius,
    rotation
}) {
    const angle = Math.PI / outerPoints;
    const angleOffsetToCenter = rotation;
    let points = "";
    const coordinates = [];
    for (let i = 0; i < outerPoints * 2; i += 1) {
        let currX = centerX + Math.cos(i * angle + angleOffsetToCenter) * radius;
        let currY = centerY + Math.sin(i * angle + angleOffsetToCenter) * radius;
        points += `${currX},${currY} `;
        coordinates.push({ x: currX, y: currY });
    }
    return {
        path: `M${points}Z`,
        coordinates
    };
}

export function createPolygonPath({
    plot,
    radius,
    sides,
    rotation = 0
}) {
    const centerX = plot.x;
    const centerY = plot.y;
    const outerPoints = sides / 2;
    return calcPolygonPoints({
        centerX,
        centerY,
        outerPoints,
        radius: radius + 1,
        rotation
    });
}

export function calcStarPoints({
    centerX,
    centerY,
    innerCirclePoints,
    innerRadius,
    outerRadius
}) {
    const angle = Math.PI / innerCirclePoints;
    const angleOffsetToCenterStar = 60;
    const totalPoints = innerCirclePoints * 2;
    let points = "";
    for (let i = 0; i < totalPoints; i += 1) {
        let isEvenIndex = i % 2 == 0;
        let r = isEvenIndex ? outerRadius : innerRadius;
        let currX = centerX + Math.cos(i * angle + angleOffsetToCenterStar) * r;
        let currY = centerY + Math.sin(i * angle + angleOffsetToCenterStar) * r;
        points += `${currX},${currY} `;
    }
    return points;
}

export function createStar({
    plot,
    radius,
    apexes = 5
}) {
    const centerX = plot.x;
    const centerY = plot.y;
    const innerCirclePoints = apexes;
    const innerRadius = (radius * 3.5) / innerCirclePoints;
    const innerOuterRadiusRatio = 2;
    const outerRadius = innerRadius * innerOuterRadiusRatio;
    return calcStarPoints({
        centerX,
        centerY,
        innerCirclePoints,
        innerRadius,
        outerRadius
    })
}

export function giftWrap({ series }) {
    if (!Array.isArray(series) || series.length === 0) return "";

    const pts = Array.from(
        new Map(
            series
                .filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y))
                .map(p => [`${p.x},${p.y}`, { x: +p.x, y: +p.y }])
        ).values()
    );
    if (pts.length === 0) return "";
    if (pts.length === 1) return `${Math.round(pts[0].x)},${Math.round(pts[0].y)} `;

    const dist2 = (a, b) => {
        const dx = a.x - b.x, dy = a.y - b.y;
        return dx * dx + dy * dy;
    };
    const cross = (o, a, b) =>
        (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

    let start = pts[0];
    for (const p of pts) {
        if (p.x < start.x || (p.x === start.x && p.y < start.y)) start = p;
    }

    const hull = [start];
    let endpoint = start;

    const maxSteps = pts.length + 2;
    let steps = 0;

    while (true) {
        if (++steps > maxSteps) break;
        let candidate = pts[0] === endpoint ? pts[1] : pts[0];
        for (const p of pts) {
            if (p === endpoint || p === candidate) continue;
            const c = cross(endpoint, candidate, p);
            if (c < 0) continue;
            if (c > 0) {
                candidate = p;
            } else {
                if (dist2(endpoint, p) > dist2(endpoint, candidate)) {
                    candidate = p;
                }
            }
        }
        if (candidate === start) break;
        hull.push(candidate);
        endpoint = candidate;
    }

    let result = "";
    for (const p of hull) {
        result += `${Math.round(p.x)},${Math.round(p.y)} `;
    }
    return result;
}


export function degreesToRadians(degrees) {
    return (degrees * Math.PI) / 180;
}

export function adaptColorToBackground(bgColor) {
    if (bgColor) {
        let color = bgColor;
        let alpha = 1;

        if (color.startsWith('rgba')) {
            const rgba = color.match(/rgba?\((\d+), (\d+), (\d+), ([\d.]+)\)/);
            if (rgba) {
                const [, r, g, b, a] = rgba;
                alpha = parseFloat(a);
                color = `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`;
            }
        }

        if (color.charAt(0) !== "#") {
            color = this.rgbToHex(bgColor);
        }

        color = color.substring(1, 7);
        let r = parseInt(color.substring(0, 2), 16);
        let g = parseInt(color.substring(2, 4), 16);
        let b = parseInt(color.substring(4, 6), 16);

        let uiColors = [r / 255, g / 255, b / 255];

        let c = uiColors.map((col) => {
            if (col <= 0.03928) {
                return col / 12.92;
            }
            return Math.pow((col + 0.055) / 1.055, 2.4);
        });

        let L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

        if (alpha < 1) {
            const blendedLuminance = alpha * L + (1 - alpha) * 1;
            return blendedLuminance > 0.3 ? "#000000" : "#FFFFFF";
        } else {
            return L > 0.3 ? "#000000" : "#FFFFFF";
        }
    }
    return "#000000";
}

function isPlainObject(x) {
    return (
        x !== null &&
        typeof x === 'object' &&
        Object.prototype.toString.call(x) === '[object Object]' &&
        (x.constructor === Object || x.constructor == null)
    );
}

// Vue reactivity objects often expose these fields; avoid descending into them
function looksLikeVueReactive(x) {
    return !!x && (
        x.__v_isRef ||
        x.__v_isReactive ||
        x.__v_isReadonly ||
        x.effect ||
        x.dep || x.deps || x.subs
    );
}

function normalizeColor(raw) {
    if (raw === '') return '#000000';
    if (raw === 'transparent') return '#FFFFFF00';
    const hex = convertColorToHex(raw);
    return hex ?? raw;
}

export function convertConfigColors(config, seen = new WeakSet()) {
    const obj = toRaw(config);
    if (!isPlainObject(obj) || seen.has(obj)) return obj;
    seen.add(obj);

    for (const key in obj) {
        const v = isRef(obj[key]) ? unref(obj[key]) : obj[key];

        if (key === 'color' || key === 'backgroundColor') {
            if (typeof v === 'string') obj[key] = normalizeColor(v);
            continue;
        }

        // "stroke" can be EITHER a color string OR a nested object
        if (key === 'stroke') {
            if (typeof v === 'string') {
                obj[key] = normalizeColor(v);
            } else if (isPlainObject(v) && !looksLikeVueReactive(v)) {
                convertConfigColors(v, seen);
            }
            continue;
        }

        if (Array.isArray(v)) {
            for (const item of v) {
                if (isPlainObject(item) && !looksLikeVueReactive(item)) {
                    convertConfigColors(item, seen);
                }
            }
            continue;
        }

        if (isPlainObject(v) && !looksLikeVueReactive(v)) {
            convertConfigColors(v, seen);
        }
    }

    return obj;
}

export function calcLinearProgression(plots) {
    let x1, y1, x2, y2;
    const len = plots.length;

    if (!plots || plots.length === 0) {
        return {
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 0,
            slope: 0,
            trend: 0
        }
    }

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (const { x, y } of plots) {
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
    }
    const slope = (len * sumXY - sumX * sumY) / (len * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / len;
    x1 = plots[0].x;
    x2 = plots[len - 1].x;
    y1 = slope * x1 + intercept;
    y2 = slope * x2 + intercept;

    const trend = calcPercentageTrend(plots.map(p => p.value));

    return { x1, y1, x2, y2, slope, trend };
}

export function calcPercentageTrend(arr) {
    const initialNumber = arr[0];
    const lastNumber = arr[arr.length - 1];
    const overallChange = lastNumber - initialNumber;

    let totalMagnitude = 0;

    for (let i = 1; i < arr.length; i++) {
        const difference = Math.abs(arr[i] - arr[i - 1]);
        totalMagnitude += difference;
    }

    const percentageTrend = (overallChange / totalMagnitude);
    return isNaN(percentageTrend) ? 0 : percentageTrend;
}

export function calcMedian(arr) {
    const mid = Math.floor(arr.length / 2);
    const nums = [...arr].sort((a, b) => a - b);
    return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

export function createStraightPath(points) {
    let arr = [];
    for (let i = 0; i < points.length; i += 1) {
        arr.push(`${checkNaN(points[i].x)},${checkNaN(points[i].y)} `)
    }
    return arr.join(' ').trim()
}

// Monotone cubic interpolation
export function createSmoothPath(points) {
    if (points.length < 2) return '0,0';

    const n = points.length - 1;
    const path = [`${checkNaN(points[0].x)},${checkNaN(points[0].y)}`];
    const dx = [], dy = [], slopes = [], tangents = [];

    for (let i = 0; i < n; i += 1) {
        dx[i] = points[i + 1].x - points[i].x;
        dy[i] = points[i + 1].y - points[i].y;
        slopes[i] = dy[i] / dx[i];
    }

    tangents[0] = slopes[0];
    tangents[n] = slopes[n - 1];

    for (let i = 1; i < n; i += 1) {
        if (slopes[i - 1] * slopes[i] <= 0) {
            tangents[i] = 0;
        } else {
            const harmonicMean = (2 * slopes[i - 1] * slopes[i]) / (slopes[i - 1] + slopes[i]);
            tangents[i] = harmonicMean;
        }
    }

    for (let i = 0; i < n; i += 1) {
        const x1 = points[i].x;
        const y1 = points[i].y;
        const x2 = points[i + 1].x;
        const y2 = points[i + 1].y;
        const m1 = tangents[i];
        const m2 = tangents[i + 1];
        const controlX1 = x1 + (x2 - x1) / 3;
        const controlY1 = y1 + m1 * (x2 - x1) / 3;
        const controlX2 = x2 - (x2 - x1) / 3;
        const controlY2 = y2 - m2 * (x2 - x1) / 3;

        path.push(`C ${checkNaN(controlX1)},${checkNaN(controlY1)} ${checkNaN(controlX2)},${checkNaN(controlY2)} ${checkNaN(x2)},${checkNaN(y2)}`);
    }

    return path.join(' ');
}

export function createSmoothPathVertical(points, smoothing = 0.2) {
    function line(pointA, pointB) {
        const lengthX = pointB.x - pointA.x;
        const lengthY = pointB.y - pointA.y;
        return {
            length: Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)),
            angle: Math.atan2(lengthY, lengthX)
        };
    }
    function controlPoint(current, previous, next, reverse) {
        const p = previous || current;
        const n = next || current;
        const o = line(p, n);

        const angle = o.angle + (reverse ? Math.PI : 0);
        const length = o.length * smoothing;

        const x = current.x + Math.cos(angle) * length;
        const y = current.y + Math.sin(angle) * length;
        return { x, y };
    }
    function bezierCommand(point, i, a) {
        const cps = controlPoint(a[i - 1], a[i - 2], point);
        const cpe = controlPoint(point, a[i - 1], a[i + 1], true);
        return `C ${checkNaN(cps.x)},${checkNaN(cps.y)} ${checkNaN(cpe.x)},${checkNaN(cpe.y)} ${checkNaN(point.x)},${checkNaN(point.y)}`;
    }
    const d = points.filter(p => !!p).reduce((acc, point, i, a) => i === 0
        ? `${checkNaN(point.x)},${checkNaN(point.y)} `
        : `${acc} ${bezierCommand(point, i, a)} `
        , '');

    return d;
}


export function createUid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
        .replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
}

export function calcMarkerOffsetX(arc, isTitle = false, offset = 16, useCss = false) {
    let x = 0;
    let offsetX = isTitle ? offset : 0;
    let anchor = useCss ? 'center' : "middle";
    if (arc.center.endX > arc.cx) {
        x = arc.center.endX + offset + offsetX;
        anchor = useCss ? 'left' : "start";
    } else if (arc.center.endX < arc.cx) {
        x = arc.center.endX - offset - offsetX;
        anchor = useCss ? 'right' : "end";
    } else {
        x = arc.centerX + offsetX;
        anchor = useCss ? 'center' : "middle";
    }
    return { x, anchor }
}

export function calcMarkerOffsetY(arc, yOffsetTop = 16, yOffsetBottom = 16) {
    if (arc.center.endY > arc.cy) {
        return arc.center.endY + yOffsetBottom;
    } else if (arc.center.endY < arc.cy) {
        return arc.center.endY - yOffsetTop;
    } else {
        return arc.center.endY;
    }
}

export function offsetFromCenterPoint({
    initX,
    initY,
    offset,
    centerX,
    centerY
}) {
    const angle = Math.atan2(initY - centerY, initX - centerX);
    return {
        x: initX + offset * Math.cos(angle),
        y: initY + offset * Math.sin(angle)
    }
}

export function findArcMidpoint(pathElement) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", 'path')
    el.setAttribute('d', pathElement)

    const length = el.getTotalLength();
    let start = 0;
    let end = length;
    let midpointParameter = length / 2;

    const epsilon = 0.01;
    while (end - start > epsilon) {
        const mid = (start + end) / 2;
        const midPoint = el.getPointAtLength(mid);
        const midLength = midPoint.x;

        if (Math.abs(midLength - midpointParameter) < epsilon) {
            midpointParameter = mid;
            break;
        } else if (midLength < midpointParameter) {
            start = mid;
        } else {
            end = mid;
        }
    }
    const { x, y } = el.getPointAtLength(midpointParameter);
    return { x, y };
}

export function getCloserPoint(centerX, centerY, x, y, arcSize) {
    if (x === centerX && y === centerY) {
        return { x: centerX, y: centerY };
    }
    const scaleFactor = getScaleFactorUsingArcSize(centerX, centerY, x, y, arcSize);
    let deltaX = x - centerX;
    let deltaY = y - centerY;
    deltaX *= scaleFactor;
    deltaY *= scaleFactor;
    const newX = centerX + deltaX;
    const newY = centerY + deltaY;
    return { x: newX, y: newY };
}

export function getScaleFactorUsingArcSize(centerX, centerY, x, y, arcSize) {
    const euclidianDistance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    const scaleFactor = 1 - arcSize / euclidianDistance;
    return scaleFactor;
}

export function calcNutArrowPath(arc, center = false, yOffsetTop = 16, yOffsetBottom = 16, toCenter = false, hideStart = false, arcSize = 0, flatLen = 12, curved = false) {
    const { x } = findArcMidpoint(arc.path)

    const start = `${calcMarkerOffsetX(arc).x},${calcMarkerOffsetY(arc, yOffsetTop, yOffsetBottom) - 4} `;

    let mid = "", midX, midY;
    if (x > arc.cx) {
        midX = calcMarkerOffsetX(arc).x - flatLen;
        midY = calcMarkerOffsetY(arc, yOffsetTop, yOffsetBottom) - 4;
        mid = `${midX},${midY}`;
    } else if (x < arc.cx) {
        midX = calcMarkerOffsetX(arc).x + flatLen;
        midY = calcMarkerOffsetY(arc, yOffsetTop, yOffsetBottom) - 4;
        mid = `${midX},${midY}`;
    } else {
        midX = calcMarkerOffsetX(arc).x + flatLen;
        midY = calcMarkerOffsetY(arc, yOffsetTop, yOffsetBottom) - 4;
        mid = `${midX},${midY}`;
    }

    const end = ` ${arc.center.endX},${arc.center.endY}`;

    if (curved) {
        if (hideStart) {
            return `M${mid} Q${mid} ${end}`;
        } else {
            return `M${start} Q${mid} ${end}`;
        }
    }

    return `M${hideStart ? '' : start}${mid}${end}`;
}

export function closestDecimal(num) {
    if (num === 0) return 0;
    const orderOfMagnitude = Math.floor(Math.log10(Math.abs(num)));
    const powerOf10 = 10 ** orderOfMagnitude;
    let roundedValue;
    if (num < 0) {
        roundedValue = Math.round(num / powerOf10) * powerOf10;
    } else {
        roundedValue = Math.round(num / powerOf10) * powerOf10;
    }
    return roundedValue;
}

export function canShowValue(num) {
    return ![null, undefined, NaN].includes(num);
}

export function sumByAttribute(arr, attr) {
    return [...arr].map(a => a[attr]).reduce((a, b) => a + b, 0)
}

export function makePath(plots, closed = true, bare = false) {
    if (!plots.length) return "M0,0";
    let path = "";
    plots.forEach(plot => {
        if (!plot) return '';
        path += `${plot.x},${plot.y} `;
    })
    if (bare) {
        return path.trim();
    } else {
        return `M${path}${closed ? 'Z' : ''}`;
    }
}

export function downloadCsv({ csvContent, title = "vue-data-ui" }) {
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(encodedUri);
}

/**
 * 
 * @param {string[][]} rows
 * @returns 
 */
export function createCsvContent(rows) {
    return `data:text/csv;charset=utf-8,${rows.map(r => r.join(',')).join('\n')}`;
}

export function lightenHexColor(hexColor, percentLighter) {
    if (!/^#([0-9A-F]{3}){1,2}([0-9A-F]{2})?$/i.test(hexColor)) {
        console.warn('lightenHexColor : Invalid hex color format');
        return "#000000";
    }

    let color = hexColor.replace('#', '');

    if (color.length === 3) {
        color = color.split('').map(c => c + c).join('');
    }

    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);

    const newR = Math.min(255, r + (255 - r) * percentLighter);
    const newG = Math.min(255, g + (255 - g) * percentLighter);
    const newB = Math.min(255, b + (255 - b) * percentLighter);

    const lighterHex = `#${Math.round(newR).toString(16).padStart(2, '0')}${Math.round(newG).toString(16).padStart(2, '0')}${Math.round(newB).toString(16).padStart(2, '0')}`;

    if (color.length === 8) {
        const alpha = color.substring(6, 8);
        return lighterHex + alpha;
    }
    return lighterHex;
}

export function darkenHexColor(hexColor, percentDarker) {
    if (!/^#([0-9A-F]{3}){1,2}([0-9A-F]{2})?$/i.test(hexColor)) {
        console.warn('darkenHexColor: Invalid hex color format');
        return "#000000";
    }

    let color = hexColor.replace('#', '');

    if (color.length === 3) {
        color = color.split('').map(c => c + c).join('');
    }

    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);

    const newR = Math.max(0, r - r * percentDarker);
    const newG = Math.max(0, g - g * percentDarker);
    const newB = Math.max(0, b - b * percentDarker);

    const darkerHex = `#${Math.round(newR).toString(16).padStart(2, '0')}${Math.round(newG).toString(16).padStart(2, '0')}${Math.round(newB).toString(16).padStart(2, '0')}`;

    if (color.length === 8) {
        const alpha = color.substring(6, 8);
        return darkerHex + alpha;
    }

    return darkerHex;
}

export function niceNum(range, round) {
    const exponent = Math.floor(Math.log10(range));
    const fraction = range / Math.pow(10, exponent);
    let niceFraction;

    if (round) {
        if (fraction < 1.5) {
            niceFraction = 1;
        } else if (fraction < 3) {
            niceFraction = 2;
        } else if (fraction < 7) {
            niceFraction = 5;
        } else {
            niceFraction = 10;
        }
    } else {
        if (fraction <= 1) {
            niceFraction = 1;
        } else if (fraction <= 2) {
            niceFraction = 2;
        } else if (fraction <= 5) {
            niceFraction = 5;
        } else {
            niceFraction = 10;
        }
    }

    return niceFraction * Math.pow(10, exponent);
}

export function calculateNiceScale(minValue, maxValue, maxTicks, rough = false) {
    const range = rough ? (maxValue - minValue) : niceNum(maxValue - minValue, false);
    const tickSpacing = rough ? (range / (maxTicks - 1)) : niceNum(range / (maxTicks - 1), true);
    const niceMin = Math.floor(minValue / tickSpacing) * tickSpacing;
    const niceMax = Math.ceil(maxValue / tickSpacing) * tickSpacing;

    const ticks = [];
    for (let tick = niceMin; tick <= niceMax; tick += tickSpacing) {
        ticks.push(tick);
    }

    return {
        min: niceMin,
        max: niceMax,
        tickSize: tickSpacing,
        ticks
    };
}

export function calculateNiceScaleWithExactExtremes(minValue, maxValue, maxTicks, rough = false) {
    const range = rough ? (maxValue - minValue) : niceNum(maxValue - minValue, false);
    const tickSpacing = rough ? (range / (maxTicks - 1)) : niceNum(range / (maxTicks - 1), true);
    const niceMin = Math.floor(minValue / tickSpacing) * tickSpacing;
    const niceMax = Math.ceil(maxValue / tickSpacing) * tickSpacing;
    let ticks = [];
    let tick = niceMin;

    while (tick <= niceMax) {
        if (tick >= minValue && tick <= maxValue) {
            ticks.push(tick);
        }
        tick += tickSpacing;
    }

    if (ticks[0] !== minValue) ticks[0] = minValue;
    if (ticks[ticks.length - 1] !== maxValue) ticks[ticks.length - 1] = maxValue;

    return {
        min: minValue,
        max: maxValue,
        tickSize: tickSpacing,
        ticks
    };
}

export function interpolateColorHex(minColor, maxColor, minValue, maxValue, value) {
    const hexToRgba = (hex) => {
        let r = parseInt(hex.substring(1, 3), 16);
        let g = parseInt(hex.substring(3, 5), 16);
        let b = parseInt(hex.substring(5, 7), 16);
        let a = 1; // Default alpha value

        if (hex.length === 9) {
            a = parseInt(hex.substring(7, 9), 16) / 255; // Extract alpha value if present
        }

        return { r, g, b, a };
    };

    const rgbToHex = ({ r, g, b, a }) => {
        const decimalToHex = (x) => x.toString(16).padStart(2, '0');
        const hex = `#${decimalToHex(r)}${decimalToHex(g)}${decimalToHex(b)}`;
        if (a !== 1) {
            const alphaHex = Math.round(a * 255).toString(16).padStart(2, '0');
            return hex + alphaHex;
        }
        return hex;
    };

    const minColorRgb = hexToRgba(minColor);
    const maxColorRgb = hexToRgba(maxColor);

    value = Math.min(Math.max(value, minValue), maxValue);
    const normalizedValue = (value - minValue) / (maxValue - minValue);

    // Interpolate RGB components
    const interpolatedRgb = {
        r: Math.round(minColorRgb.r + (maxColorRgb.r - minColorRgb.r) * normalizedValue),
        g: Math.round(minColorRgb.g + (maxColorRgb.g - minColorRgb.g) * normalizedValue),
        b: Math.round(minColorRgb.b + (maxColorRgb.b - minColorRgb.b) * normalizedValue),
    };

    // Interpolate alpha channel if present
    const interpolatedAlpha = minColorRgb.a + (maxColorRgb.a - minColorRgb.a) * normalizedValue;

    return rgbToHex({ ...interpolatedRgb, a: interpolatedAlpha });
}

/**
 * @typedef DataLabel
 * @type {object}
 * @property {string=} p - prefix
 * @property {(number|string)} v - value
 * @property {string=} s - suffix
 * @property {number=} r - rounding
 * @property {boolean=} space  - space between elements
 * @property {boolean=} isAnimating
 * @property {RegExp=} regex - replacements when isAnimating is true
 * @property {string=} replacement - the replacement for regex result when isAnimating is true
 * @property {locale=} locale - the region code
 * @type {DataLabel}
 */
export function dataLabel({ p = '', v, s = '', r = 0, space = false, isAnimating = false, regex = /[^%]/g, replacement = '-', locale = null }) {
    const num = locale ?
        Number(Number(v).toFixed(r)).toLocaleString(locale) :
        Number(Number(v).toFixed(r)).toLocaleString();
    const numStr = num === Infinity ? '∞' : num === -Infinity ? '-∞' : num;
    const result = `${p ?? ''}${space ? ' ' : ''}${[undefined, null].includes(v) ? '-' : numStr}${space ? ' ' : ''}${s ?? ''}`
    return isAnimating ? result.replace(regex, replacement) : result
}

/**
 * @typedef Abbreviation
 * @type {object}
 * @property {(number|string)} source - The string to abbreviate
 * @property {number=} length - The size of the abbreviation
 * @type {Abbreviation}
 */
export function abbreviate({ source, length = 3 }) {
    if (!source && source !== 0) {
        return ''
    }
    source = String(source);
    const sourceSplit = source.length > 1 ? source.split(' ') : [source];
    if (sourceSplit.length === 1 && sourceSplit[0].length === 1) {
        return String(source).toUpperCase()
    }
    if (sourceSplit.length === 1) {
        return source.slice(0, length).toUpperCase()
    } else {
        const result = [];
        sourceSplit.forEach((chunk, i) => {
            if (i < length) {
                result.push(chunk.slice(0, 1))
            }
        })
        return result.join().replaceAll(',', '').toUpperCase();
    }
}

export function isFunction(func) {
    return !!func && typeof func === 'function';
}

export function functionReturnsString(func) {
    return typeof func.apply(null, arguments) === 'string';
}

export function objectIsEmpty(obj) {
    if (Array.isArray(obj)) {
        return obj.length === 0
    }
    return Object.keys(obj).length === 0
}

export function error({ componentName, type, property = '', index = '', key = '', warn = true, debug = true }) {
    if (!debug) return;
    const message = `\n> ${errors[type].replace('#COMP#', componentName).replace('#ATTR#', property).replace('#INDX#', index).replace('#KEY#', key)}\n`;
    if (warn) {
        console.warn(message)
    } else {
        throw new Error(message)
    }
}

export function generateSpiralCoordinates({ points, a, b, angleStep, startX, startY }) {
    const coordinates = [];

    for (let i = 0; i < points; i++) {
        const theta = angleStep * i;
        const r = a + b * theta;
        const x = r * Math.cos(theta) + startX;
        const y = r * Math.sin(theta) + startY;
        coordinates.push({ x, y });
    }

    return coordinates;
}

function boundsOf(points) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY, width: maxX - minX || 1, height: maxY - minY || 1 };
}

function buildSmoothPath(coordinates) {
    if (!coordinates.length) return "";
    let path = `M${coordinates[0].x} ${coordinates[0].y}`;
    for (let i = 1; i < coordinates.length - 2; i += 2) {
        const p0 = coordinates[i - 1];
        const p1 = coordinates[i];
        const p2 = coordinates[i + 1];
        const p3 = coordinates[i + 2];
        const xc1 = (p0.x + p1.x) / 2;
        const yc1 = (p0.y + p1.y) / 2;
        const xc2 = (p1.x + p2.x) / 2;
        const yc2 = (p1.y + p2.y) / 2;
        const xc3 = (p2.x + p3.x) / 2;
        const yc3 = (p2.y + p3.y) / 2;
        path += ` C${xc1} ${yc1}, ${xc2} ${yc2}, ${xc3} ${yc3}`;
    }
    return path;
}

export function createSpiralPath({
    maxPoints,
    a = 6,
    b = 6,
    angleStep = 0.07,
    startX,
    startY,
    boxWidth,
    boxHeight,
    padding = 12
}) {
    const raw = generateSpiralCoordinates({ points: maxPoints, a, b, angleStep, startX: 0, startY: 0 });
    const { minX, minY, maxX, maxY, width, height } = boundsOf(raw);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const availW = Math.max(1, boxWidth - 2 * padding);
    const availH = Math.max(1, boxHeight - 2 * padding);
    const s = Math.min(availW / width, availH / height);
    const tx = startX - cx * s;
    const ty = startY - cy * s;
    return function toPath(endPoints) {
        const n = Math.max(2, Math.min(Math.round(endPoints), raw.length));
        const fitted = raw.slice(0, n).map(p => ({ x: p.x * s + tx, y: p.y * s + ty }));
        return buildSmoothPath(fitted);
    };
}


export function calculateDistance(point1, point2) {
    return Math.sqrt((point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2);
}

export function areCirclesOverlapping(circle1, circle2, threshold) {
    const distance = Math.sqrt((circle2.x - circle1.x) ** 2 + (circle2.y - circle1.y) ** 2);
    return distance < threshold;
}

export function calculateAverageDistance(points) {
    if (points.length < 2) return 0;

    let totalDistance = 0;
    let count = 0;

    for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
            totalDistance += calculateDistance(points[i], points[j]);
            count += 1;
        }
    }
    return totalDistance / count;
}

export function mergePointsByProximity(points, threshold = 0.15) {
    const clusters = [];
    const visited = new Array(points.length).fill(false);

    points.forEach((point, index) => {
        if (!visited[index]) {
            const cluster = [];
            const stack = [point];
            visited[index] = true;

            while (stack.length > 0) {
                const currentPoint = stack.pop();
                cluster.push(currentPoint);
                points.forEach((otherPoint, otherIndex) => {
                    if (!visited[otherIndex] && areCirclesOverlapping(currentPoint, otherPoint, threshold)) {
                        stack.push(otherPoint);
                        visited[otherIndex] = true;
                    }
                });
            }

            clusters.push(cluster);
        }
    });

    const result = clusters.map(cluster => {
        const averageX = cluster.reduce((acc, p) => acc + p.x, 0) / cluster.length;
        const averageY = cluster.reduce((acc, p) => acc + p.y, 0) / cluster.length;
        return { x: averageX, y: averageY };
    });

    return result
}

export function getMissingDatasetAttributes({ datasetObject, requiredAttributes }) {
    let errors = [];
    requiredAttributes.forEach(attribute => {
        if (!Object.hasOwn(datasetObject, attribute)) {
            errors.push(attribute);
        }
    });
    return errors;
}

const COLOR_MAP = {
    ALICEBLUE: "#F0F8FF",
    ANTIQUEWHITE: "#FAEBD7",
    AQUA: "#00FFFF",
    AQUAMARINE: "#7FFFD4",
    AZURE: "#F0FFFF",
    BEIGE: "#F5F5DC",
    BISQUE: "#FFE4C4",
    BLACK: "#000000",
    BLANCHEDALMOND: "#FFEBCD",
    BLUE: "#0000FF",
    BLUEVIOLET: "#8A2BE2",
    BROWN: "#A52A2A",
    BURLYWOOD: "#DEB887",
    CADETBLUE: "#5F9EA0",
    CHARTREUSE: "#7FFF00",
    CHOCOLATE: "#D2691E",
    CORAL: "#FF7F50",
    CORNFLOWERBLUE: "#6495ED",
    CORNSILK: "#FFF8DC",
    CRIMSON: "#DC143C",
    CYAN: "#00FFFF",
    DARKBLUE: "#00008B",
    DARKCYAN: "#008B8B",
    DARKGOLDENROD: "#B8860B",
    DARKGREY: "#A9A9A9",
    DARKGREEN: "#006400",
    DARKKHAKI: "#BDB76B",
    DARKMAGENTA: "#8B008B",
    DARKOLIVEGREEN: "#556B2F",
    DARKORANGE: "#FF8C00",
    DARKORCHID: "#9932CC",
    DARKRED: "#8B0000",
    DARKSALMON: "#E9967A",
    DARKSEAGREEN: "#8FBC8F",
    DARKSLATEBLUE: "#483D8B",
    DARKSLATEGREY: "#2F4F4F",
    DARKTURQUOISE: "#00CED1",
    DARKVIOLET: "#9400D3",
    DEEPPINK: "#FF1493",
    DEEPSKYBLUE: "#00BFFF",
    DIMGRAY: "#696969",
    DODGERBLUE: "#1E90FF",
    FIREBRICK: "#B22222",
    FLORALWHITE: "#FFFAF0",
    FORESTGREEN: "#228B22",
    FUCHSIA: "#FF00FF",
    GAINSBORO: "#DCDCDC",
    GHOSTWHITE: "#F8F8FF",
    GOLD: "#FFD700",
    GOLDENROD: "#DAA520",
    GREY: "#808080",
    GREEN: "#008000",
    GREENYELLOW: "#ADFF2F",
    HONEYDEW: "#F0FFF0",
    HOTPINK: "#FF69B4",
    INDIANRED: "#CD5C5C",
    INDIGO: "#4B0082",
    IVORY: "#FFFFF0",
    KHAKI: "#F0E68C",
    LAVENDER: "#E6E6FA",
    LAVENDERBLUSH: "#FFF0F5",
    LAWNGREEN: "#7CFC00",
    LEMONCHIFFON: "#FFFACD",
    LIGHTBLUE: "#ADD8E6",
    LIGHTCORAL: "#F08080",
    LIGHTCYAN: "#E0FFFF",
    LIGHTGOLDENRODYELLOW: "#FAFAD2",
    LIGHTGREY: "#D3D3D3",
    LIGHTGREEN: "#90EE90",
    LIGHTPINK: "#FFB6C1",
    LIGHTSALMON: "#FFA07A",
    LIGHTSEAGREEN: "#20B2AA",
    LIGHTSKYBLUE: "#87CEFA",
    LIGHTSLATEGREY: "#778899",
    LIGHTSTEELBLUE: "#B0C4DE",
    LIGHTYELLOW: "#FFFFE0",
    LIME: "#00FF00",
    LIMEGREEN: "#32CD32",
    LINEN: "#FAF0E6",
    MAGENTA: "#FF00FF",
    MAROON: "#800000",
    MEDIUMAQUAMARINE: "#66CDAA",
    MEDIUMBLUE: "#0000CD",
    MEDIUMORCHID: "#BA55D3",
    MEDIUMPURPLE: "#9370D8",
    MEDIUMSEAGREEN: "#3CB371",
    MEDIUMSLATEBLUE: "#7B68EE",
    MEDIUMSPRINGGREEN: "#00FA9A",
    MEDIUMTURQUOISE: "#48D1CC",
    MEDIUMVIOLETRED: "#C71585",
    MIDNIGHTBLUE: "#191970",
    MINTCREAM: "#F5FFFA",
    MISTYROSE: "#FFE4E1",
    MOCCASIN: "#FFE4B5",
    NAVAJOWHITE: "#FFDEAD",
    NAVY: "#000080",
    OLDLACE: "#FDF5E6",
    OLIVE: "#808000",
    OLIVEDRAB: "#6B8E23",
    ORANGE: "#FFA500",
    ORANGERED: "#FF4500",
    ORCHID: "#DA70D6",
    PALEGOLDENROD: "#EEE8AA",
    PALEGREEN: "#98FB98",
    PALETURQUOISE: "#AFEEEE",
    PALEVIOLETRED: "#D87093",
    PAPAYAWHIP: "#FFEFD5",
    PEACHPUFF: "#FFDAB9",
    PERU: "#CD853F",
    PINK: "#FFC0CB",
    PLUM: "#DDA0DD",
    POWDERBLUE: "#B0E0E6",
    PURPLE: "#800080",
    RED: "#FF0000",
    ROSYBROWN: "#BC8F8F",
    ROYALBLUE: "#4169E1",
    SADDLEBROWN: "#8B4513",
    SALMON: "#FA8072",
    SANDYBROWN: "#F4A460",
    SEAGREEN: "#2E8B57",
    SEASHELL: "#FFF5EE",
    SIENNA: "#A0522D",
    SILVER: "#C0C0C0",
    SKYBLUE: "#87CEEB",
    SLATEBLUE: "#6A5ACD",
    SLATEGREY: "#708090",
    SNOW: "#FFFAFA",
    SPRINGGREEN: "#00FF7F",
    STEELBLUE: "#4682B4",
    TAN: "#D2B48C",
    TEAL: "#008080",
    THISTLE: "#D8BFD8",
    TOMATO: "#FF6347",
    TURQUOISE: "#40E0D0",
    VIOLET: "#EE82EE",
    WHEAT: "#F5DEB3",
    WHITE: "#FFFFFF",
    WHITESMOKE: "#F5F5F5",
    YELLOW: "#FFFF00",
    YELLOWGREEN: "#9ACD32",
    REBECCAPURPLE: "#663399"
};

export function convertNameColorToHex(colorName) {
    const v = isRef?.(colorName) ? unref(colorName) : colorName;
    if (typeof v !== 'string') return v;
    const s = v.trim();
    if (s === '') return s;
    if (s[0] === '#') return s;
    if (s.toLowerCase() === 'transparent') return '#FFFFFF00';
    const upper = s.toUpperCase();
    const normalized = upper.replace(/GRAY/g, 'GREY');
    return COLOR_MAP[upper] || COLOR_MAP[normalized] || s;
}

export const XMLNS = "http://www.w3.org/2000/svg";

export function calcTrend(numbers) {
    if (numbers.length < 2) {
        return 0;
    }

    let totalPercentageChange = 0;
    let pairsCount = 0;

    for (let i = 1; i < numbers.length; i++) {
        const initial = numbers[i - 1];
        const final = numbers[i];

        if ([null, undefined, 0, Infinity, -Infinity].includes(initial)) {
            continue;
        }

        const percentageChange = ((final - initial) / Math.abs(initial)) * 100;
        totalPercentageChange += percentageChange;
        pairsCount++;
    }

    if (pairsCount === 0) {
        return 0;
    }

    const averagePercentageChange = totalPercentageChange / pairsCount;

    return averagePercentageChange;
}

export function createTSpansFromLineBreaksOnX({ content, fontSize, fill, x, y }) {
    const lines = content.split('\n');
    return lines
        .map((line, idx) =>
            `<tspan x="${x}" y="${y + idx * (fontSize)}" fill="${fill}">${line}</tspan>`
        )
        .join('');
}

export function createTSpansFromLineBreaksOnY({ content, fontSize, fill, x }) {
    const lines = content.split('\n');
    return lines
        .map((line, idx) => {
            const dy = idx === 0 ? 0 : fontSize;
            return `<tspan x="${x}" dy="${dy}" fill="${fill}">${line}</tspan>`;
        })
        .join('');
}

export function createTSpans({
    content,
    fontSize,
    fill,
    maxWords,
    x,
    y
}) {
    function chunk(text, len) {
        const words = text.split(" ");
        const chunks = [];

        for (let i = 0; i < words.length; i += len) {
            chunks.push(words.slice(i, i + len).join(" "));
        }

        return chunks;
    }
    let tspans = "";
    const chunks = chunk(content, maxWords);

    chunks.forEach((c, i) => {
        const tspan = `<tspan x="${x}" y="${y + (i * fontSize)}" fill="${fill}">${c}</tspan>`;
        tspans += tspan
    });

    return tspans;
}

export function convertCustomPalette(colors) {
    if (!colors.length) {
        return []
    }
    return colors.map(c => convertColorToHex(c))
}

/**
 * Creates a dataset suitable for a word cloud from a plain text input.
 * This function processes the text by removing punctuation, splitting into words,
 * and counting the occurrences of each word. It also allows for a callback function
 * to modify each word before it's included in the final dataset.
 * 
 * @param {string} text - The plain text input to process. The function will remove 
 *                        punctuation, handle CJK characters appropriately, and count 
 *                        word frequencies.
 * 
 * @param {function(string): string} [callback=null] - An optional callback function
 *                                                     to transform each word. The function 
 *                                                     takes a word as input and returns 
 *                                                     a transformed word. If provided,
 *                                                     the callback should return a string.
 * 
 * @returns {Array<Object>} A dataset for a word cloud, where each object contains:
 *  - `name` (string): The word or its transformed version (if a callback is provided).
 *  - `value` (number): The frequency of the word in the input text.
 * 
 * @example
 * // Basic usage without a callback
 * const text = "Hello world! Hello everyone.";
 * const dataset = createWordCloudDatasetFromPlainText(text);
 * console.log(dataset);
 * // Output: [ { name: 'Hello', value: 2 }, { name: 'world', value: 1 }, { name: 'everyone', value: 1 } ]
 * 
 * @example
 * // Using a callback to convert words to uppercase
 * const text = "Hello world! Hello everyone.";
 * const dataset = createWordCloudDatasetFromPlainText(text, word => word.toUpperCase());
 * console.log(dataset);
 * // Output: [ { name: 'HELLO', value: 2 }, { name: 'WORLD', value: 1 }, { name: 'EVERYONE', value: 1 } ]
 * 
 * @example
 * // Handling CJK text
 * const text = "你好，世界！你好，大家！";
 * const dataset = createWordCloudDatasetFromPlainText(text);
 * console.log(dataset);
 * // Output: [ { name: '你', value: 2 }, { name: '好', value: 2 }, { name: '世', value: 1 }, { name: '界', value: 1 }, { name: '大', value: 1 }, { name: '家', value: 1 } ]
 * 
 */
export function createWordCloudDatasetFromPlainText(text, callback = null) {
    const textWithoutPunctuation = text.replace(/[\p{P}\p{S}]+/gu, ' ').trim();

    const isCJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Tibetan}\p{Script=Myanmar}\p{Script=Devanagari}]/u.test(text);

    const words = isCJK
        ? [...textWithoutPunctuation]
        : textWithoutPunctuation.split(/\s+/);

    const filteredWords = words.filter(word => word.trim().length > 0);

    const wordCountMap = filteredWords.reduce((map, word) => {
        if (map[word]) {
            map[word] += 1;
        } else {
            map[word] = 1;
        }
        return map;
    }, {});

    return Object.keys(wordCountMap).map(word => {
        let w = word;

        if (typeof callback === 'function' && typeof callback(word) === 'string') {
            w = callback(word)
        }

        return {
            name: w,
            value: wordCountMap[word],
        }
    });
}

export function assignStackRatios(arr) {
    let providedRatioSum = arr.reduce((sum, item) => sum + (item.stackRatio || 0), 0);
    let itemsWithoutRatio = arr.filter(item => item.stackRatio === undefined).length;
    let remainingRatio = 1 - providedRatioSum;
    let defaultRatio = itemsWithoutRatio > 0 ? remainingRatio / itemsWithoutRatio : 0;

    let output = arr.map(item => ({
        ...item,
        stackRatio: item.stackRatio !== undefined ? item.stackRatio : defaultRatio
    }));

    let cumulatedRatio = 0;
    output = output.map((item, i) => {
        cumulatedRatio += item.stackRatio;
        return {
            ...item,
            stackIndex: i,
            cumulatedStackRatio: cumulatedRatio
        };
    });
    return output;
}

export function getPathLengthFromCoordinates(d) {
    function distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function bezierLength(p0, p1, p2, p3) {
        const steps = 100;
        let length = 0;
        let prevX = p0.x;
        let prevY = p0.y;

        for (let i = 1; i <= steps; i += 1) {
            const t = i / steps;
            const oneMinusT = 1 - t;
            const oneMinusTSquared = oneMinusT * oneMinusT;
            const tSquared = t * t;

            const x = oneMinusTSquared * oneMinusT * p0.x +
                3 * oneMinusTSquared * t * p1.x +
                3 * oneMinusT * tSquared * p2.x +
                tSquared * t * p3.x;
            const y = oneMinusTSquared * oneMinusT * p0.y +
                3 * oneMinusTSquared * t * p1.y +
                3 * oneMinusT * tSquared * p2.y +
                tSquared * t * p3.y;
            length += distance(prevX, prevY, x, y);
            prevX = x;
            prevY = y;
        }

        return length;
    }

    const commands = d.match(/[a-zA-Z][^a-zA-Z]*/g);
    let currentX = 0, currentY = 0;
    let startX = 0, startY = 0;
    let totalLength = 0;

    commands.forEach(command => {
        const type = command[0];
        const values = command.slice(1).trim().split(/[\s,]+/).map(Number);
        let i = 0;

        switch (type) {
            case 'M':
                currentX = values[i++];
                currentY = values[i++];
                startX = currentX;
                startY = currentY;
                while (i < values.length) {
                    totalLength += distance(currentX, currentY, values[i], values[i + 1]);
                    currentX = values[i++];
                    currentY = values[i++];
                }
                break;

            case 'L':
                while (i < values.length) {
                    totalLength += distance(currentX, currentY, values[i], values[i + 1]);
                    currentX = values[i++];
                    currentY = values[i++];
                }
                break;

            case 'H':
                while (i < values.length) {
                    totalLength += distance(currentX, currentY, values[i], currentY);
                    currentX = values[i++];
                }
                break;

            case 'V':
                while (i < values.length) {
                    totalLength += distance(currentX, currentY, currentX, values[i]);
                    currentY = values[i++];
                }
                break;

            case 'C':
                while (i < values.length) {
                    totalLength += bezierLength(
                        { x: currentX, y: currentY },
                        { x: values[i], y: values[i + 1] },
                        { x: values[i + 2], y: values[i + 3] },
                        { x: values[i + 4], y: values[i + 5] }
                    );
                    currentX = values[i + 4];
                    currentY = values[i + 5];
                    i += 6;
                }
                break;

            case 'Z':
                totalLength += distance(currentX, currentY, startX, startY);
                currentX = startX;
                currentY = startY;
                break;
        }
    });

    return totalLength;
}

export function translateSize({
    relator,
    adjuster,
    source,
    threshold = 0,
    fallback,
    max = 24
}) {
    const computedVal = relator / (adjuster / source);

    if (computedVal > max) {
        return max
    }

    return computedVal < threshold
        ? fallback
        : computedVal;
}

export function sumSeries(source) {
    return source.reduce((acc, obj) => {
        obj.series.forEach((num, i) => {
            if (![undefined, null, Infinity, -Infinity].includes(num) && !isNaN(num)) {
                acc[i] = (acc[i] || 0) + num;
            }
        });
        return acc;
    }, []);
}

export function checkFormatter(func, { value, config }) {
    let isValid = false;
    let formattedValue = value;

    if (typeof func === 'function') {
        try {
            // Ensure that the function is called with an object containing `value` and `config`
            formattedValue = func({ value, config });

            if (['number', 'string'].includes(typeof formattedValue)) {
                isValid = true;
            } else {
                formattedValue = value;
            }
        } catch (err) {
            console.warn('Formatter could not be applied:', err);
            isValid = false;
        }
    }

    return {
        isValid,
        value: formattedValue
    };
}

export function applyDataLabel(func, data, fallbackValue, config) {
    const { isValid, value } = checkFormatter(func, { value: data, config });
    return isValid ? value : fallbackValue;
}

export function hasDeepProperty(obj, path) {
    return path.split('.').every(key => {
        if (obj !== null && typeof obj === 'object' && key in obj) {
            obj = obj[key];
            return true;
        }
        return false;
    });
}

export function sanitizeArray(arr, keys = []) {

    function sanitizeValue(value) {
        if (typeof value === 'string' && isNaN(Number(value))) return value;
        return (typeof value === 'number' && isFinite(value)) ? value : 0;
    }

    function sanitize(data) {
        if (Array.isArray(data)) {
            return data.map(item => sanitize(item));
        } else if (typeof data === 'object' && data !== null) {

            let sanitizedObject = { ...data };
            keys.forEach(key => {
                if (sanitizedObject.hasOwnProperty(key) && ![
                    'NAME',
                    'name',
                    'TITLE',
                    'title',
                    'DESCRIPTION',
                    'description',
                    'LABEL',
                    'label',
                    'TIME',
                    'time',
                    'PERIOD',
                    'period',
                    'MONTH',
                    'month',
                    'YEAR',
                    'year',
                    'MONTHS',
                    'months',
                    'YEARS',
                    'years',
                    'DAY',
                    'day',
                    'DAYS',
                    'days',
                    'HOUR',
                    'hour',
                    'HOURS',
                    'hours'
                ].includes(key) && Array.isArray(sanitizedObject[key])) {
                    sanitizedObject[key] = sanitize(sanitizedObject[key]);
                }
            });
            return Object.fromEntries(
                Object.entries(sanitizedObject).map(([k, v]) => [k, sanitize(v)])
            );
        } else {
            return sanitizeValue(data);
        }
    }

    return sanitize(arr);
}

export function setOpacity(hex, opac = 100) {
    if (hex.length === 9) {
        return hex.substring(0, 7) + opacity[opac]
    }
    return hex + opacity[opac]
}

export function createPolarAreas({ series, center, maxRadius, hasGhost = false }) {
    const totalSegments = series.length;
    const anglePerSegment = 360 / (totalSegments - (hasGhost ? 1 : 0));

    const paths = series.map((item, index) => {
        const proportion = item;
        const radius = proportion * maxRadius;

        const startAngle = index * anglePerSegment;
        const endAngle = startAngle + anglePerSegment;
        const middleAngle = startAngle + anglePerSegment / 2;

        const startAngleRad = degreesToRadians(startAngle) - degreesToRadians(90);
        const endAngleRad = degreesToRadians(endAngle) - degreesToRadians(90);
        const middleAngleRad = degreesToRadians(middleAngle) - degreesToRadians(90);

        const startX = center.x + radius * Math.cos(startAngleRad);
        const startY = center.y + radius * Math.sin(startAngleRad);
        const endX = center.x + radius * Math.cos(endAngleRad);
        const endY = center.y + radius * Math.sin(endAngleRad);
        const middleX = center.x + radius * Math.cos(middleAngleRad);
        const middleY = center.y + radius * Math.sin(middleAngleRad);

        const path = `
            M ${center.x} ${center.y} 
            L ${startX} ${startY} 
            A ${radius} ${radius} 0 0 1 ${endX} ${endY} 
            Z
        `;

        return {
            path: path.trim(),
            middlePoint: { x: middleX, y: middleY },
            radius
        };
    });

    return paths;
}

export function createShadesOfGrey(startColor, steps) {
    if (!/^#([0-9A-F]{2})\1\1$/i.test(startColor)) {
        throw new Error("Invalid starting color. HEX must be used.");
    }
    const hexToDec = (hex) => parseInt(hex, 16);
    const decToHex = (dec) => dec.toString(16).padStart(2, "0");
    const baseValue = hexToDec(startColor.slice(1, 3));
    const increment = Math.floor(255 / (steps - 1));
    const shades = [];
    for (let i = 0; i < steps; i++) {
        let shadeValue = Math.min(255, Math.max(0, baseValue + increment * (i - Math.floor(steps / 2))));
        let hexShade = `#${decToHex(shadeValue).repeat(3)}`;
        shades.push(hexShade);
    }
    return shades;
}

/**
 * LTTB algorithm for a ds with coordinates
 * @param {Array<Object>} data
 * @param {number} threshold
 * @returns {Array<Object>}
 */
export function largestTriangleThreeBuckets({ data, threshold }) {
    if (threshold >= data.length || threshold < 3) {
        return data;
    }
    const sampled = [];
    const bucketSize = (data.length - 2) / (threshold - 2);
    let a = 0;
    // First point as is
    sampled.push(data[a]);
    for (let i = 0; i < threshold - 2; i += 1) {
        const bucketStart = Math.floor((i + 1) * bucketSize) + 1;
        const bucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length);
        const bucket = data.slice(bucketStart, bucketEnd);
        let averageX = 0;
        let averageY = 0;
        for (const point of bucket) {
            averageX += point.x;
            averageY += point.y;
        }
        averageX /= bucket.length;
        averageY /= bucket.length;
        let maxArea = -1;
        let nextA = a;
        for (let j = bucketStart; j < bucketEnd; j += 1) {
            const area = Math.abs(
                (data[a].x - averageX) * (data[j].y - data[a].y) -
                (data[a].x - data[j].x) * (averageY - data[a].y)
            );
            if (area > maxArea) {
                maxArea = area;
                nextA = j;
            }
        }
        sampled.push(data[nextA]);
        a = nextA;
    }
    // Last point as is
    sampled.push(data[data.length - 1]);
    return sampled;
}

/**
 * LTTB algorithm for an array of numbers.
 * @param {Array<number>} data
 * @param {number} threshold
 * @returns {Array<number>}
 */
export function largestTriangleThreeBucketsArray({ data, threshold }) {
    if (threshold >= data.length || threshold < 3) {
        return data;
    }
    const sampled = [];
    const bucketSize = (data.length - 2) / (threshold - 2);
    let a = 0;
    // First point as is
    sampled.push(data[a]);
    for (let i = 0; i < threshold - 2; i += 1) {
        const bucketStart = Math.floor((i + 1) * bucketSize) + 1;
        const bucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length);
        const bucket = data.slice(bucketStart, bucketEnd);
        const average = bucket.reduce((a, b) => a + b, 0) / bucket.length;
        let maxArea = -1;
        let nextA = a;

        for (let j = bucketStart; j < bucketEnd; j += 1) {
            const area = Math.abs((data[a] - average) * (j - a));
            if (area > maxArea) {
                maxArea = area;
                nextA = j;
            }
        }
        sampled.push(data[nextA]);
        a = nextA;
    }
    // Last point as is
    sampled.push(data[data.length - 1]);
    return sampled;
}

/**
 * LTTB algorithm for an array of objects containing 'name' and 'value'.
 * @param {Array<{ name: string, value: number }>} data
 * @param {number} threshold 
 * @returns {Array<{ name: string, value: number }>}
 */
export function largestTriangleThreeBucketsArrayObjects({ data, threshold, key = 'value' }) {
    if (threshold >= data.length || threshold < 3) {
        return data;
    }

    const sampled = [];
    const bucketSize = (data.length - 2) / (threshold - 2);
    let a = 0;

    // First point as is
    sampled.push(data[a]);

    for (let i = 0; i < threshold - 2; i += 1) {
        const bucketStart = Math.floor((i + 1) * bucketSize) + 1;
        const bucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length);
        const bucket = data.slice(bucketStart, bucketEnd);

        const average = bucket.reduce((sum, point) => sum + point[key], 0) / bucket.length;

        let maxArea = -1;
        let nextA = a;

        for (let j = bucketStart; j < bucketEnd; j += 1) {
            const area = Math.abs((data[a][key] - average) * (j - a));
            if (area > maxArea) {
                maxArea = area;
                nextA = j;
            }
        }

        sampled.push(data[nextA]);
        a = nextA;
    }

    sampled.push(data[data.length - 1]);

    return sampled;
}

export function createHalfCircleArc({ radius, centerX, centerY, percentage }) {
    percentage = Math.max(0, Math.min(1, percentage));
    const angleRadians = percentage * Math.PI;
    const startX = centerX - radius;
    const startY = centerY;
    const endX = centerX - radius * Math.cos(angleRadians);
    const endY = centerY - radius * Math.sin(angleRadians);
    const largeArcFlag = 0;
    const sweepFlag = 1;
    const path = `M ${centerX},${centerY} L ${startX},${startY} A ${radius},${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX},${endY} Z`;
    return path.trim();
}

export function placeHTMLElementAtSVGCoordinates({ svgElement, x, y, offsetY = 0, element }) {
    if (!svgElement || !element) return { top: 0, left: 0 };

    const point = svgElement.createSVGPoint();
    point.x = x;
    point.y = y;
    const t_point = point.matrixTransform(svgElement.getScreenCTM());
    const svgRect = svgElement.getBoundingClientRect();
    const rect = element.getBoundingClientRect();

    let _offsetX = 0;
    let _offsetY = 0;

    if (t_point.x - rect.width / 2 < svgRect.left) {
        _offsetX = 0
    } else if (t_point.x + rect.width > svgRect.right) {
        _offsetX = -rect.width
    } else {
        _offsetX = -rect.width / 2
    }

    if (t_point.y - offsetY - rect.height < svgRect.top) {
        _offsetY = offsetY
    } else {
        _offsetY = -rect.height - offsetY
    }

    return {
        top: t_point.y + _offsetY,
        left: t_point.x + _offsetX
    };
}

export function placeXYTag({ svgElement, x, y, element, position }) {
    if (!svgElement || !element) return { top: 0, left: 0 };

    const point = svgElement.createSVGPoint();
    point.x = x;
    point.y = y;
    const t_point = point.matrixTransform(svgElement.getScreenCTM());
    const { height, width } = element.getBoundingClientRect()

    let _offsetX = position === 'right' ? 0 : -width;
    let _offsetY = -(height / 2);

    return {
        top: t_point.y + _offsetY,
        left: t_point.x + _offsetX
    };
}

export function deepClone(value) {
    if (value === null || typeof value !== 'object') {
        return value;
    }

    if (value instanceof Date) {
        return new Date(value.getTime());
    }

    if (value instanceof RegExp) {
        return new RegExp(value.source, value.flags);
    }

    if (value instanceof Map) {
        const result = new Map();
        for (const [key, val] of value.entries()) {
            result.set(key, deepClone(val));
        }
        return result;
    }

    if (value instanceof Set) {
        const result = new Set();
        for (const val of value.values()) {
            result.add(deepClone(val));
        }
        return result;
    }

    if (Array.isArray(value)) {
        return value.map(item => deepClone(item));
    }

    const result = {};
    for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
            result[key] = deepClone(value[key]);
        }
    }
    return result;
}

export function getAreaSegments(points) {
    const segments = [];
    let current = [];
    for (const p of points) {
        if (!p || p.value == null || Number.isNaN(p.x) || Number.isNaN(p.y)) {
            if (current.length) segments.push(current);
            current = [];
        } else {
            current.push(p);
        }
    }
    if (current.length) segments.push(current);
    return segments;
}

export function createAreaWithCuts(plots, zero) {
    if (!plots[0]) return [-10, -10, '', -10, -10].toString();

    const segments = getAreaSegments(plots);
    if (!segments.length) return '';
    return segments.map(seg => {
        const start = { x: seg[0].x, y: zero };
        const end = { x: seg.at(-1).x, y: zero };
        const path = [];
        seg.forEach(plot => {
            path.push(`${plot.x},${plot.y} `);
        });
        return [start.x, start.y, ...path, end.x, end.y].toString();
    }).join(';');
}

export function createIndividualArea(plots, zero) {
    const validPlots = plots.filter(p => !!p);
    if (!validPlots[0]) return [-10, -10, '', -10, -10].toString();
    const start = { x: validPlots[0].x, y: zero };
    const end = { x: validPlots.at(-1).x, y: zero };
    const path = [];
    validPlots.forEach(plot => {
        path.push(`${plot.x},${plot.y} `);
    });
    return [start.x, start.y, ...path, end.x, end.y].toString();
}

export function createIndividualAreaWithCuts(plots, zero) {
    if (!plots[0]) return [-10, -10, '', -10, -10].toString();

    const segments = getAreaSegments(plots);
    if (!segments.length) return '';
    return segments.map(seg => {
        const start = { x: seg[0].x, y: zero };
        const end = { x: seg.at(-1).x, y: zero };
        const path = [];
        seg.forEach(plot => {
            path.push(`${plot.x},${plot.y} `);
        });
        return [start.x, start.y, ...path, end.x, end.y].toString();
    }).join(';');
}

export function getValidSegments(points) {
    const segments = [];
    let current = [];
    for (const p of points) {
        if (p.value == null || Number.isNaN(p.x) || Number.isNaN(p.y)) {
            if (current.length > 1) segments.push(current);
            current = [];
        } else {
            current.push(p);
        }
    }
    if (current.length > 1) segments.push(current);
    return segments;
}

export function createStraightPathWithCuts(points) {
    let d = '';
    let sawFirst = false;

    const isValid = p =>
        p.value != null &&
        Number.isFinite(p.x) &&
        Number.isFinite(p.y);

    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (!isValid(p)) {
            continue;
        }

        const coord = `${checkNaN(p.x)},${checkNaN(p.y)}`;

        if (!sawFirst) {
            d += coord;
            sawFirst = true;
        } else {
            const prev = points[i - 1];
            const cmd = isValid(prev) ? 'L' : 'M';
            d += `${cmd}${coord}`;
        }
        d += ' ';
    }
    return d.trim();
}

export function createSmoothPathWithCuts(points) {
    const segments = getValidSegments(points);

    if (!segments.length) return '';

    let fullPath = '';
    for (const [idx, seg] of segments.entries()) {
        if (seg.length < 2) continue;
        const n = seg.length - 1;
        const dx = [], dy = [], slopes = [], tangents = [];
        for (let i = 0; i < n; i += 1) {
            dx[i] = seg[i + 1].x - seg[i].x;
            dy[i] = seg[i + 1].y - seg[i].y;
            slopes[i] = dy[i] / dx[i];
        }
        tangents[0] = slopes[0];
        tangents[n] = slopes[n - 1];
        for (let i = 1; i < n; i += 1) {
            if (slopes[i - 1] * slopes[i] <= 0) {
                tangents[i] = 0;
            } else {
                const harmonicMean = (2 * slopes[i - 1] * slopes[i]) / (slopes[i - 1] + slopes[i]);
                tangents[i] = harmonicMean;
            }
        }

        fullPath += `${idx === 0 ? '' : 'M'}${checkNaN(seg[0].x)},${checkNaN(seg[0].y)} `;
        for (let i = 0; i < n; i += 1) {
            const x1 = seg[i].x;
            const y1 = seg[i].y;
            const x2 = seg[i + 1].x;
            const y2 = seg[i + 1].y;
            const m1 = tangents[i];
            const m2 = tangents[i + 1];
            const controlX1 = x1 + (x2 - x1) / 3;
            const controlY1 = y1 + m1 * (x2 - x1) / 3;
            const controlX2 = x2 - (x2 - x1) / 3;
            const controlY2 = y2 - m2 * (x2 - x1) / 3;
            fullPath += `C${checkNaN(controlX1)},${checkNaN(controlY1)} ${checkNaN(controlX2)},${checkNaN(controlY2)} ${checkNaN(x2)},${checkNaN(y2)} `;
        }
    }
    return fullPath.trim();
}

export function createSmoothAreaSegments(points, zero, cut = false, close = true) {
    function getSegments(points) {
        const segs = [];
        let curr = [];
        for (const p of points) {
            if (!p || p.value == null || Number.isNaN(p.x) || Number.isNaN(p.y)) {
                if (curr.length > 1) segs.push(curr);
                curr = [];
            } else {
                curr.push(p);
            }
        }
        if (curr.length > 1) segs.push(curr);
        return segs;
    }
    const segments = cut ? getSegments(points) : [points];
    return segments.map(seg => {
        if (seg.length < 2) return '';
        const n = seg.length - 1;
        const dx = [], dy = [], slopes = [], tangents = [];
        for (let i = 0; i < n; i += 1) {
            dx[i] = seg[i + 1].x - seg[i].x;
            dy[i] = seg[i + 1].y - seg[i].y;
            slopes[i] = dy[i] / dx[i];
        }
        tangents[0] = slopes[0];
        tangents[n] = slopes[n - 1];
        for (let i = 1; i < n; i += 1) {
            if (slopes[i - 1] * slopes[i] <= 0) {
                tangents[i] = 0;
            } else {
                const harmonicMean = (2 * slopes[i - 1] * slopes[i]) / (slopes[i - 1] + slopes[i]);
                tangents[i] = harmonicMean;
            }
        }
        let d = `M${seg[0].x},${zero}`;
        d += ` L${seg[0].x},${seg[0].y}`;
        for (let i = 0; i < n; i += 1) {
            const x1 = seg[i].x;
            const y1 = seg[i].y;
            const x2 = seg[i + 1].x;
            const y2 = seg[i + 1].y;
            const m1 = tangents[i];
            const m2 = tangents[i + 1];
            const controlX1 = x1 + (x2 - x1) / 3;
            const controlY1 = y1 + m1 * (x2 - x1) / 3;
            const controlX2 = x2 - (x2 - x1) / 3;
            const controlY2 = y2 - m2 * (x2 - x1) / 3;
            d += ` C${controlX1},${controlY1} ${controlX2},${controlY2} ${x2},${y2}`;
        }
        d += ` L${seg[n].x},${zero} ${close ? 'Z' : ''}`;
        return d;
    }).filter(Boolean);
}

export function slugify(str) {
    return str
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim start
        .replace(/-+$/, ''); // Trim end
}

export function emptyObjectToNull(obj) {
    if (
        obj &&
        typeof obj === 'object' &&
        !Array.isArray(obj) &&
        Object.keys(obj).length === 0
    ) {
        return null;
    }
    return obj;
}

export function deepEmptyObjectToNull(value) {
    if (Array.isArray(value)) {
        return value.map(deepEmptyObjectToNull);
    } else if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
    ) {
        const result = {};
        for (const key in value) {
            if (Object.hasOwn(value, key)) {
                result[key] = deepEmptyObjectToNull(value[key]);
            }
        }
        return emptyObjectToNull(result);
    }
    return value;
}

export function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

export function getCumulativeAverage({ values, config = {} }) {
    const {
        keepInvalid = true,
        convertInvalidToZero = false,
    } = config;

    const avg = [];
    let sum = 0;
    let count = 0;

    function isInvalid(n) {
        return typeof n !== "number" || !Number.isFinite(n)
    }

    function addAvg(n) {
        sum += n;
        count += 1;
        avg.push(sum / count);
    }

    for (const v of values) {
        if (!isInvalid(v)) addAvg(v);
        else if (convertInvalidToZero && keepInvalid) addAvg(0);
        else if (!convertInvalidToZero && keepInvalid) avg.push(v);
    }

    return avg;
}

export function getCumulativeMedian({ values, config = {} }) {
    const {
        keepInvalid = true,
        convertInvalidToZero = false,
    } = config;

    const medians = [];
    const list = [];

    function isInvalid(n) {
        return typeof n !== "number" || !Number.isFinite(n);
    }

    function addMedian(n) {
        list.push(n);
        list.sort((a, b) => a - b);
        const len = list.length;
        const mid = len >> 1;
        if (len % 2 === 1) {
            medians.push(list[mid]);
        } else {
            medians.push((list[mid - 1] + list[mid]) / 2);
        }
    }

    for (const v of values) {
        if (!isInvalid(v)) addMedian(v)
        else if (convertInvalidToZero && keepInvalid) addMedian(0);
        else if (!convertInvalidToZero && keepInvalid) medians.push(v);
    }
    return medians;
}

export function setOpacityIfWithinBBox({
    el,
    container,
    padding = 1
}) {
    if (!el || !container) return;

    let elBB = el.getBBox();
    let contBB = container.getBBox();

    if (elBB.x < contBB.x + padding || elBB.y < contBB.y + padding || (elBB.x + elBB.width) > (contBB.x + contBB.width - padding) || (elBB.y + elBB.height) > (contBB.y + contBB.height - padding)) {
        el.style.opacity = '0'
    } else {
        el.style.opacity = '1'
    }
}

export function autoFontSize({
    el,
    bounds,
    currentFontSize,
    minFontSize = 6,
    attempts = 200,
    padding = 1
}) {
    if (!el || !currentFontSize) return 0;

    let fontSize = currentFontSize;

    el.style.fontSize = fontSize;

    const { x, y, width: W, height: H } = bounds;
    const cLeft = x + padding;
    const cTop = y + padding;
    const cRight = x + W - padding;
    const cBottom = y + H - padding;

    let er = el.getBBox();

    if (
        er.x >= cLeft + padding &&
        er.y >= cTop + padding &&
        er.x + er.width <= cRight - padding &&
        er.y + er.height <= cBottom - padding
    ) {
        return fontSize;
    }

    let tries = attempts;

    while (tries-- > 0 && fontSize > minFontSize) {
        fontSize--;
        el.style.fontSize = fontSize;
        er = el.getBBox();
        if (
            er.x >= cLeft + padding &&
            er.y >= cTop + padding &&
            er.x + er.width <= cRight - padding &&
            er.y + er.height <= cBottom - padding
        ) {
            break;
        }
    }
    if (fontSize < minFontSize) {
        fontSize = 0;
        el.style.fontSize = 0;
    }
    return fontSize;
}

/**
 * Starts observing for nodes with a given CSS class inside a specific container
 * and fires callback whenever at least one such node is present.
 *
 * @param {HTMLElement} container       container element to observe
 * @param {string} cssClass            class name without the leading dot
 * @param {() => void} onNodesPresent  function to call when matching elements appear
 * @returns {MutationObserver}         the observer instance (so you can disconnect it later)
 */
export function observeClassPresenceIn(container, cssClass, onNodesPresent) {
    if (typeof cssClass !== 'string' || !cssClass.trim()) {
        console.error('Vue Data UI - observeClassPresenceIn: cssClass must be a non-empty string');
    }
    if (typeof onNodesPresent !== 'function') {
        console.error('Vue Data UI - observeClassPresenceIn: onNodesPresent must be a function');
    }

    const selector = `.${cssClass}`;
    let hasSeen = false;

    // Check the container for matching elements and trigger callback once per transition 0 → >0
    function checkAndTrigger() {
        const nodes = container.querySelectorAll(selector);
        if (nodes.length > 0) {
            if (!hasSeen) {
                hasSeen = true;
                onNodesPresent();
            }
        } else {
            hasSeen = false;
        }
    }

    // Observe the container for additions/removals anywhere in its subtree
    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.addedNodes.length || m.removedNodes.length) {
                checkAndTrigger();
                break;
            }
        }
    });

    observer.observe(container, {
        childList: true,
        subtree: true,
    });

    // Initial check in case elements are already present
    checkAndTrigger();

    return observer;
}

/**
 * Formats numeric values with a controlled number of decimal places,
 * applying maxDecimals for all values when no fallbackFormatter is given,
 * or calling the fallbackFormatter for values ≥ 1 if provided.
 *
 * @param {Object}   options
 * @param {number}   options.value The numeric value to format.
 * @param {number}   [options.maxDecimals=4] Max number of decimal places.
 * @param {Function} [options.fallbackFormatter] Callback for values ≥ 1; receives the raw value and must return a string
 * @param {boolean}  [options.removeTrailingZero=true] Whether to strip unnecessary trailing zeros.
 * @returns {string}  The formatted number as a string.
 */
export function formatSmallValue({
    value,
    maxDecimals = 4,
    fallbackFormatter,
    removeTrailingZero = true,
}) {
    if (value === 0) {
        return '0';
    }

    const abs = Math.abs(value);

    if (abs >= 1 && typeof fallbackFormatter === 'function') {
        const fb = fallbackFormatter(value);
        return String(fb);
    }

    let decimals;
    if (abs < 1) {
        const exp = Math.floor(Math.log10(abs));
        decimals = Math.min(Math.max(1 - exp, 1), maxDecimals);
    } else {
        decimals = maxDecimals;
    }

    let str = value.toFixed(decimals);

    if (removeTrailingZero) {
        str = str
            .replace(/(\.\d*?[1-9])0+$/, '$1')   // drop zeros after last non-zero
            .replace(/\.0+$/, '');               // drop ".0"
    }

    return str;
}

// Create skeleton dataset with basic fib
export function fib(n) {
    const a = [];
    for (let i = 0; i < n; i += 1) {
        a.push(i === 0 ? 0 : i === 1 ? 1 : a[i - 1] + a[i - 2]);
    }
    return a;
}

export function wrapText(str, maxChars = 20) {
    str = str.replace(/[\r\n]+/g, " ");

    const words = str.split(" ");
    let line = "";
    let result = "";

    for (let word of words) {
        if ((line + (line ? " " : "") + word).length <= maxChars) {
            line += (line ? " " : "") + word;
        } else {
            if (line) {
                result += (result ? "\n" : "") + line;
            }
            line = word;
        }
    }

    if (line) {
        result += (result ? "\n" : "") + line;
    }

    return result;
}

const lib = {
    XMLNS,
    abbreviate,
    adaptColorToBackground,
    addVector,
    applyDataLabel,
    assignStackRatios,
    autoFontSize,
    calcLinearProgression,
    calcMarkerOffsetX,
    calcMarkerOffsetY,
    calcMedian,
    calcNutArrowPath,
    calcTrend,
    calculateNiceScale,
    calculateNiceScaleWithExactExtremes,
    canShowValue,
    checkArray,
    checkFormatter,
    checkNaN,
    checkObj,
    closestDecimal,
    convertColorToHex,
    convertConfigColors,
    convertCustomPalette,
    createAreaWithCuts,
    createCsvContent,
    createHalfCircleArc,
    createIndividualArea,
    createIndividualAreaWithCuts,
    createPolarAreas,
    createPolygonPath,
    createShadesOfGrey,
    createSmoothAreaSegments,
    createSmoothPath,
    createSmoothPathVertical,
    createSmoothPathWithCuts,
    createSpiralPath,
    createStar,
    createStraightPath,
    createStraightPathWithCuts,
    createTSpans,
    createTSpansFromLineBreaksOnX,
    createTSpansFromLineBreaksOnY,
    createUid,
    createWordCloudDatasetFromPlainText,
    darkenHexColor,
    dataLabel,
    deepClone,
    deepEmptyObjectToNull,
    degreesToRadians,
    downloadCsv,
    easeOutCubic,
    emptyObjectToNull,
    error,
    fib,
    forceValidValue,
    formatSmallValue,
    functionReturnsString,
    generateSpiralCoordinates,
    getAreaSegments,
    getCloserPoint,
    getCumulativeAverage,
    getCumulativeMedian,
    getMissingDatasetAttributes,
    getPalette,
    getScaleFactorUsingArcSize,
    giftWrap,
    hasDeepProperty,
    interpolateColorHex,
    isFunction,
    isSafeValue,
    isValidUserValue,
    largestTriangleThreeBucketsArray,
    largestTriangleThreeBucketsArrayObjects,
    lightenHexColor,
    makeDonut,
    makePath,
    matrixTimes,
    mergePointsByProximity,
    objectIsEmpty,
    observeClassPresenceIn,
    opacity,
    palette,
    placeHTMLElementAtSVGCoordinates,
    placeXYTag,
    rotateMatrix,
    sanitizeArray,
    setOpacity,
    setOpacityIfWithinBBox,
    shiftHue,
    slugify,
    sumByAttribute,
    sumSeries,
    themePalettes,
    translateSize,
    treeShake,
    wrapText
};
export default lib;