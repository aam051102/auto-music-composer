import { Midi, Track } from "@tonejs/midi";
import dayjs from "dayjs";
import fs from "fs";
import { INote, ISong } from "./types";

function randRange(start: number, end: number) {
    return Math.random() * (end - start) + start;
}

function snapTime(time: number, snap: number) {
    return time - (time % snap);
}

// NOTE: Overlapping existing melodies (and possibly doing some culling) could be a good way to generate solid new melodies!
// TODO: Maybe snap to bars instead of steps? Or maybe just sometimes to steps? Maybe build melody in layers, starting with a few bar-length notes, then going shorter and fewer in notes.
// TODO: Fix baseNote change resulting in no use of lower notes. Also just in general consider ways to permit different keys being used in melody - or maybe have that be a different layer?
// TODO: For double-length parts (verses + bridges), consider having first 3/4th of second half be the same as the first half, and then just have the two endings be different?
// TODO: Prioritize creating 4-step notes and 2-step notes and down-prioritize 1-step notes and 3-step notes.

// TODO: Add chord parts, add base parts, add beat parts (kick+hat+snare ?) - make some sort of algorithm change in makeMelody to permit these different sorts of structures and use-cases.

const song: ISong = {
    bpm: 130,
    signatureNum: 4,
    signatureDen: 4,
    structure: [
        { id: 0, length: 2 },
        { id: 1, length: 1 },
        { id: 2, length: 2 },
        { id: 1, length: 1 },
        { id: 3, length: 2 }, // VERSE - DO SOMETHING HERE I GUESS?
        { id: 1, length: 1 },
        { id: 1, length: 1 },
    ],
    baseNote: 60,
};

const MIDI_RANGE = { start: 36, end: 108 };
const BLOCK_STEP_COUNT = 64;
const BLOCK_BEAT_COUNT = 16;

function makeSegment() {}

function makeMelody(song: ISong, blockCount: number) {
    const secondsPerBeat = 60 / song.bpm;
    const stepLength = secondsPerBeat / 4;
    const blockLength = secondsPerBeat * BLOCK_BEAT_COUNT;
    const segmentLength = blockLength / 4;

    const baseSemi = 0;
    const noteKeys: Record<number, number[]> = {
        0: [0, 2, 4, 5, 7, 9, 11],
    };

    const melodyStructure = [0, 1];

    // Construct 4 potential segments
    const segments: INote[][] = [];

    for (let i = 0; i < blockCount; i++) {
        // Construct notes
        const segmentStructure = [0, 0, 0, 1];
        const segmentNotes: INote[][] = [];

        const segmentNoteCount = Math.round(randRange(3, 16 / 2));

        for (let k = 0; k < 4; k++) {
            const notes: INote[] = [];

            let leftMostTime = 0;

            for (let j = 0; j < segmentNoteCount; j++) {
                let noteTime = snapTime(
                    randRange(leftMostTime, leftMostTime + segmentLength / 4),
                    stepLength
                );

                const noteDuration = Math.max(
                    snapTime(randRange(0, segmentLength / 4), stepLength),
                    stepLength
                );

                if (noteTime + noteDuration > segmentLength) {
                    // Prevent segment notes from exceeding segment
                    break;
                }

                leftMostTime = noteTime + noteDuration;

                notes.push({
                    midi:
                        song.baseNote +
                        noteKeys[baseSemi][
                            Math.floor(
                                randRange(0, noteKeys[baseSemi].length - 1)
                            )
                        ],
                    time: noteTime,
                    duration: noteDuration,
                });
            }

            segmentNotes.push(notes);
        }

        // Construct melody from segments and segment structure
        const segment: INote[] = [];
        let timeOffset = 0;

        for (const index of segmentStructure) {
            segment.push(
                ...segmentNotes[index].map((note) => ({
                    ...note,
                    time: note.time + timeOffset,
                }))
            );

            timeOffset += segmentLength;
        }

        segments.push(segment);
    }

    // Construct melody from segments and segment structure
    const melody: INote[] = [];
    let timeOffset = 0;

    for (let i = 0; i < blockCount; i++) {
        melody.push(
            ...segments[melodyStructure[i]].map((note) => ({
                ...note,
                time: note.time + timeOffset,
            }))
        );

        timeOffset += blockLength;
    }

    return melody;
}

function makePart(song: ISong, blockCount: number) {
    return [makeMelody(song, blockCount)];
}

function makeSong(song: ISong) {
    const midi = new Midi();
    midi.header.setTempo(song.bpm);

    const tracks: Record<number, Track> = {};

    const secondsPerBeat = 60 / song.bpm;
    const blockLength = secondsPerBeat * BLOCK_BEAT_COUNT;

    const parts: Record<number, INote[][]> = [];

    let timeOffset = 0;

    for (const segment of song.structure) {
        const part = parts[segment.id] ?? makePart(song, segment.length);
        parts[segment.id] = part;

        for (let i = 0; i < part.length; i++) {
            if (!tracks[i]) tracks[i] = midi.addTrack();

            for (const item of part[i]) {
                tracks[i].addNote({
                    midi: item.midi,
                    time: item.time + timeOffset,
                    duration: item.duration,
                    velocity: 0.75, // Hard-coded normalized velocity - temporary
                });
            }
        }

        timeOffset += blockLength * segment.length;
    }

    return midi;
}

const completeSong = makeSong(song);

const fileName = `./outputs/${dayjs().format("YYYY-MM-DD[_]HH-mm")}.mid`;

console.log("Song output to: ", fileName);

fs.writeFileSync(fileName, Buffer.from(completeSong.toArray()));
