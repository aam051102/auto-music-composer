export type ISong = {
    bpm: number;
    /**
     * IGNORE SIGNATURE
     */
    signatureNum: number;
    /**
     * IGNORE SIGNATURE
     */
    signatureDen: number;
    structure: ("VERSE" | "CHORUS" | "BRIDGE")[];
};

export type INote = {
    midi: number;
    time: number;
    duration: number;
};
