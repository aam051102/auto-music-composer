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
    partStructure: [0, 1, 2, 1, 3, 1, 1],
    parts: {
        0: {
            blockStructure: [
                [0, 0, 0, 1],
                [0, 0, 0, 2],
            ],
        },
        1: {
            blockStructure: [[0, 0, 0, 1]],
        },
        2: {
            blockStructure: [
                [0, 0, 0, 1],
                [0, 0, 0, 2],
            ],
        },
        3: {
            // BRIDGE - DO SOMETHING HERE I GUESS?
            blockStructure: [
                [0, 0, 0, 1],
                [0, 0, 0, 2],
            ],
        },
    },
    baseNote: 60,
};

const MIDI_RANGE = { start: 36, end: 108 };
const BLOCK_STEP_COUNT = 64;
const BLOCK_BEAT_COUNT = 16;

function makeSegment() {}

function makeMelody(song: ISong, segmentId: number) {
    const secondsPerBeat = 60 / song.bpm;

    /**
     * A block is 4 bars
     */
    const blockLength = secondsPerBeat * BLOCK_BEAT_COUNT;

    const stepLength = secondsPerBeat / 4;
    const barLength = blockLength / 4;

    const baseToneOffset = 0;
    const noteKeys: Record<number, number[]> = {
        0: [0, 2, 4, 5, 7, 9, 11],
    };

    function makeBar() {
        const segmentNoteCount = Math.round(randRange(3, 16 / 2));

        // Create notes for bar
        const notes: INote[] = [];

        let leftMostTime = 0;

        for (let j = 0; j < segmentNoteCount; j++) {
            const SNAP_TIME = stepLength * 2;
            const SNAP_LENGTH = stepLength * 2;

            let noteTime = snapTime(
                randRange(leftMostTime, leftMostTime + barLength / 4),
                SNAP_TIME
            );

            const noteDuration = Math.max(
                snapTime(randRange(0, barLength / 4), SNAP_LENGTH),
                SNAP_LENGTH
            );

            if (noteTime + noteDuration > barLength) {
                // Prevent segment notes from exceeding segment
                break;
            }

            leftMostTime = noteTime + noteDuration;

            notes.push({
                midi:
                    song.baseNote +
                    noteKeys[baseToneOffset][
                        Math.floor(
                            randRange(0, noteKeys[baseToneOffset].length - 1)
                        )
                    ],
                time: noteTime,
                duration: noteDuration,
            });
        }

        return notes;
    }

    // Construct melody from segments and segment structure
    const melody: INote[] = [];
    let timeOffset = 0;
    const barMap: Record<number, INote[]> = {};

    for (const blockStructure of song.parts[song.partStructure[segmentId]]
        .blockStructure) {
        for (const barId of blockStructure) {
            const notes = barMap[barId] ? barMap[barId] : makeBar();
            barMap[barId] = notes;

            melody.push(
                ...notes.map((note) => ({
                    ...note,
                    time: note.time + timeOffset,
                }))
            );

            timeOffset += barLength;
        }
    }

    return melody;
}

function makePart(song: ISong, segmentId: number) {
    return [makeMelody(song, segmentId)];
}

function makeSong(song: ISong) {
    const midi = new Midi();
    midi.header.setTempo(song.bpm);

    const tracks: Record<number, Track> = {};

    const secondsPerBeat = 60 / song.bpm;
    const blockLength = secondsPerBeat * BLOCK_BEAT_COUNT;

    const parts: Record<number, INote[][]> = [];

    let timeOffset = 0;

    for (const segmentId of song.partStructure) {
        const segment = song.parts[segmentId];

        const part = parts[segmentId] ?? makePart(song, segmentId);
        parts[segmentId] = part;

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

        timeOffset += blockLength * segment.blockStructure.length;
    }

    return midi;
}

const completeSong = makeSong(song);

const fileName = `./outputs/${dayjs().format("YYYY-MM-DD[_]HH-mm")}.mid`;

console.log("Song output to: ", fileName);

fs.writeFileSync(fileName, Buffer.from(completeSong.toArray()));
