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
    /**
     * A list of part IDs, a part being equivalent to a chorus, verse, bridge, etc.
     */
    partStructure: number[];
    baseNote: number;
    /**
     * A map of part IDs to data on the part.
     */
    parts: Record<
        number,
        {
            blockStructure: number[][];
            /**
             * Chord IDs persist across parts.
             */
            chordStructure: number[][];
        }
    >;
    type: "major" | "minor";
};

export type INote = {
    midi: number;
    time: number;
    duration: number;
    velocity: number;
};
