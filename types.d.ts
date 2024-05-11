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
    partStructure: number[];
    baseNote: number;
    parts: Record<
        number,
        {
            blockStructure: number[][];
        }
    >;
};

export type INote = {
    midi: number;
    time: number;
    duration: number;
};
