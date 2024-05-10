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
    structure: { id: number; length: number }[];
    baseNote: number;
};

export type INote = {
    midi: number;
    time: number;
    duration: number;
};
