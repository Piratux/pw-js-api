/** @module Types/Atlases */

export interface AtlasesMeta {
    app: "https://github.com/odrick/gulp-free-tex-packer";
    version: string;
    image: string;
    format: string;
    size: { w: number; h: number; };
    scale: number;
}

export interface AtlasesFrame {
    filename: string;
    frame: Record<"x"|"y"|"w"|"h", number>;
    rotated: boolean;
    trimmed: boolean;
    spriteSourceSize: Record<"x"|"y"|"w"|"h", number>;
    sourceSize: Record<"w"|"h", number>;
    pivot: Record<"x"|"y", number>;
}

export interface AtlasesResult {
    frames: AtlasesFrame[];
    meta: AtlasesMeta;
}