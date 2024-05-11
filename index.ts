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
// TODO: Prioritize creating 4-step notes and 2-step notes and down-prioritize 1-step notes and 3-step notes. ??
// TODO: Have chord parts be interconnected across entire piece rather than being individually created per part.

// TODO: Make BPM randomly generated between a range (70-90)
// TODO: Do something to randomize song structure.
// TODO: Modify beat parts to be more repetetive!!!

/**
 * Song - Currently focused on Lo-Fi
 * When importing into FL Studio:
 * - Move chords down 1 octave
 * - Set instrument for melody and chords to be LABS Soft Piano - probably turned up to 200% or above.
 * - Set instrument for bass to be Accoustic Bass and move down an octave.
 * - Copy over all the kicks, hats, and snares to new tracks with new instruments because FL Studio messes up the instrument.
 */
const song: ISong = {
    bpm: 80,
    signatureNum: 4,
    signatureDen: 4,
    partStructure: [0, 1, 2, 1, 3, 1, 1],
    parts: {
        0: {
            blockStructure: [
                [0, 0, 0, 1],
                [0, 0, 0, 2],
            ],
            chordStructure: [
                [0, 1, 2, 3],
                [0, 1, 2, 4],
            ],
        },
        1: {
            blockStructure: [[0, 0, 0, 1]],
            chordStructure: [[0, 1, 2, 3]],
        },
        2: {
            blockStructure: [
                [0, 0, 0, 1],
                [0, 0, 0, 2],
            ],
            chordStructure: [
                [0, 1, 2, 3],
                [0, 1, 2, 4],
            ],
        },
        3: {
            // BRIDGE - DO SOMETHING HERE I GUESS?
            blockStructure: [
                [0, 0, 0, 1],
                [0, 0, 0, 2],
            ],
            chordStructure: [
                [5, 6, 7, 8],
                [5, 6, 7, 9],
            ],
        },
    },
    baseNote: 60,
    type: "major",
};

const MIDI_RANGE = { start: 36, end: 108 };
const BLOCK_STEP_COUNT = 64;
const BLOCK_BEAT_COUNT = 16;

function makeMelody(song: ISong, partId: number) {
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
                velocity: 0.75,
            });
        }

        return notes;
    }

    // Construct melody from segments and segment structure
    const melody: INote[] = [];
    let timeOffset = 0;
    const barMap: Record<number, INote[]> = {};

    for (const blockStructure of song.parts[partId].blockStructure) {
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

function makeChords(song: ISong, partId: number) {
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
        // Create notes for bar
        const notes: INote[] = [];

        const rootTone =
            song.baseNote +
            noteKeys[baseToneOffset][
                Math.floor(randRange(0, noteKeys[baseToneOffset].length - 1))
            ];

        const stamps = {
            major: [
                [0, 4, 7], // Major 3rd
                [0, 4, 7, 11], // Major 5th
            ],
            minor: [
                [0, 3, 7], // Minor 3rd
                [0, 3, 7, 10], // Minor 5th
                [0, 3, 7, 10, 14], // Minor 9th
            ],
        };
        const stampIndex = Math.floor(randRange(0, stamps[song.type].length));
        const stamp = stamps[song.type][stampIndex];

        for (const stampOffset of stamp) {
            notes.push({
                midi: rootTone + stampOffset,
                time: 0,
                duration: barLength,
                velocity: 0.65,
            });
        }

        // Bass
        notes.push({
            midi: rootTone,
            time: 0,
            duration: barLength,
            velocity: 0.65,
        });

        return notes;
    }

    // Construct melody from segments and segment structure
    const melody: INote[] = [];
    let timeOffset = 0;
    const barMap: Record<number, INote[]> = {};

    for (const blockStructure of song.parts[partId].chordStructure) {
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

/**
 * Automatically constructs bass from chords
 */
function makeAutoBass(chords: INote[]) {
    const bass: INote[] = [];
    const lowestNotes: Record<number, INote> = {};

    for (const note of chords) {
        if (
            !lowestNotes[note.time] ||
            note.midi - lowestNotes[note.time].midi
        ) {
            lowestNotes[note.time] = note;
        }
    }

    for (const note of Object.values(lowestNotes)) {
        bass.push({
            duration: note.duration,
            time: note.time,
            midi: note.midi,
            velocity: 0.75,
        });
    }

    return bass;
}

function makeBeats(song: ISong, partId: number) {
    const secondsPerBeat = 60 / song.bpm;

    /**
     * A block is 4 bars
     */
    const blockLength = secondsPerBeat * BLOCK_BEAT_COUNT;

    const stepLength = secondsPerBeat / 4;
    const barLength = blockLength / 4;

    function makeBar(minNoteCount: number, maxNoteCount: number) {
        const segmentNoteCount = Math.round(
            randRange(minNoteCount, maxNoteCount)
        );

        // Create notes for bar
        const notes: INote[] = [];

        for (let j = 0; j < segmentNoteCount; j++) {
            const SNAP_TIME = stepLength * 2;

            let noteTime = snapTime(randRange(0, barLength), SNAP_TIME);

            const noteDuration = stepLength;

            if (noteTime + noteDuration > barLength) {
                // Prevent segment notes from exceeding segment
                break;
            }

            notes.push({
                midi: 60,
                time: noteTime,
                duration: noteDuration,
                velocity: 0.75,
            });
        }

        // Culling
        const finalNotes: INote[] = [];

        let heldTimes = new Set<number>();
        for (const note of notes) {
            if (heldTimes.has(note.time)) {
                continue;
            }

            heldTimes.add(note.time);
            finalNotes.push(note);
        }

        return finalNotes;
    }

    // Kicks
    const kicks: INote[] = [];

    let timeOffset = 0;

    for (let i = 0; i < 4 * song.parts[partId].blockStructure.length; i++) {
        const notes = makeBar(2, 4);

        kicks.push(
            ...notes.map((note) => ({
                ...note,
                time: note.time + timeOffset,
            }))
        );

        timeOffset += barLength;
    }

    // Hats
    const hats: INote[] = [];

    timeOffset = 0;

    for (let i = 0; i < 4 * song.parts[partId].blockStructure.length; i++) {
        const notes = makeBar(6, 8);

        hats.push(
            ...notes.map((note) => ({
                ...note,
                time: note.time + timeOffset,
            }))
        );

        timeOffset += barLength;
    }

    // Snares
    const snares: INote[] = [];

    timeOffset = 0;

    for (let i = 0; i < 4 * song.parts[partId].blockStructure.length; i++) {
        const notes = makeBar(1, 2);

        snares.push(
            ...notes.map((note) => ({
                ...note,
                time: note.time + timeOffset,
            }))
        );

        timeOffset += barLength;
    }

    return [kicks, hats, snares];
}

function makePart(song: ISong, partId: number) {
    const melody = makeMelody(song, partId);
    const chords = makeChords(song, partId);
    const bass = makeAutoBass(chords);
    const beats = makeBeats(song, partId);

    return [melody, chords, bass, ...beats];
}

function makeSong(song: ISong) {
    const midi = new Midi();
    midi.header.setTempo(song.bpm);

    const tracks: Record<number, Track> = {};

    const secondsPerBeat = 60 / song.bpm;
    const blockLength = secondsPerBeat * BLOCK_BEAT_COUNT;

    const parts: Record<number, INote[][]> = [];

    let timeOffset = 0;

    for (const partId of song.partStructure) {
        const part = song.parts[partId];

        const partNotes = parts[partId] ?? makePart(song, partId);
        parts[partId] = partNotes;

        for (let i = 0; i < partNotes.length; i++) {
            if (!tracks[i]) tracks[i] = midi.addTrack();

            for (const item of partNotes[i]) {
                tracks[i].addNote({
                    midi: item.midi,
                    time: item.time + timeOffset,
                    duration: item.duration,
                    velocity: item.velocity,
                });
            }
        }

        timeOffset += blockLength * part.blockStructure.length;
    }

    return midi;
}

const completeSong = makeSong(song);

const fileName = `./outputs/${dayjs().format("YYYY-MM-DD[_]HH-mm")}.mid`;

console.log("Song output to: ", fileName);

fs.writeFileSync(fileName, Buffer.from(completeSong.toArray()));
