import { Midi } from "@tonejs/midi";
import dayjs from "dayjs";
import fs from "fs";

type ISong = {
    bpm: number;
    signatureNum: number;
    signatureDen: number;
    structure: ("VERSE" | "CHORUS" | "BRIDGE")[];
};

const song: ISong = {
    bpm: 130,
    signatureNum: 4,
    signatureDen: 4,
    structure: [
        "VERSE",
        "CHORUS",
        "VERSE",
        "CHORUS",
        "BRIDGE",
        "CHORUS",
        "CHORUS",
    ],
};

const MIDI_RANGE = { start: 36, end: 108 };

function makeSegment() {}

function makeMelody(song: ISong) {
    const baseNote = 60;
    const segmentStructure = [0, 0, 0, 1];

    const segments: {
        midi: number;
        time: number;
        duration: number;
    }[][] = [];

    for (let i = 0; i < 4; i++) {
        const segment = [
            {
                midi:
                    Math.random() * (MIDI_RANGE.end - MIDI_RANGE.start) +
                    MIDI_RANGE.start,
                time: Math.random() * (10 - 0) + 0,
                duration: Math.random() * (10 - 0) + 0,
            },
        ];

        segments.push(segment);
    }

    const melody: {
        midi: number;
        time: number;
        duration: number;
    }[] = [];

    for (const index of segmentStructure) {
        melody.push(...segments[index]);
    }

    return melody;
}

function makePart(song: ISong) {
    return makeMelody(song);
}

function makeSong(song: ISong) {
    const midi = new Midi();
    const track = midi.addTrack();

    for (const segment of song.structure) {
        const part = makePart(song);

        for (const item of part) {
            track.addNote({
                midi: item.midi,
                time: item.time,
                duration: item.duration,
            });
        }
    }

    return midi;
}

const completeSong = makeSong(song);

const fileName = `./outputs/${dayjs().format("YYYY-MM-DD[_]HH-mm")}.mid`;

console.log("Song output to: ", fileName);

fs.writeFileSync(fileName, Buffer.from(completeSong.toArray()));
