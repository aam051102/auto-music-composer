import { Midi } from "@tonejs/midi";
import dayjs from "dayjs";
import fs from "fs";
import { INote, ISong } from "./types";

function randRange(start: number, end: number) {
    return Math.random() * (end - start) + start;
}

function snapTime(time: number, snap: number) {
    return time - (time % snap);
}

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
const BLOCK_STEP_COUNT = 64;
const BLOCK_BEAT_COUNT = 16;

function makeSegment() {}

function makeMelody(song: ISong) {
    const secondsPerBeat = 60 / song.bpm;
    const blockLength = secondsPerBeat * BLOCK_BEAT_COUNT;
    const stepLength = secondsPerBeat / 4;
    const segmentLength = secondsPerBeat * BLOCK_BEAT_COUNT;

    const baseNote = 60;
    const baseSemi = 0;
    const noteKeys: Record<number, number[]> = {
        0: [0, 2, 4, 5, 7, 9, 11],
    };

    const segmentStructure = [0, 0, 0, 1];

    // Construct 4 potential segments
    const segments: INote[][] = [];

    for (let i = 0; i < 4; i++) {
        const segmentNoteCount = Math.round(randRange(4, 8));
        const segment: INote[] = [];

        let leftMostTime = 0;

        // Construct notes
        for (let j = 0; j < segmentNoteCount; j++) {
            let noteTime = snapTime(
                randRange(leftMostTime, leftMostTime + segmentLength / 8),
                stepLength
            );

            const noteDuration = Math.max(
                snapTime(randRange(0, segmentLength / 8), stepLength),
                stepLength
            );

            if (noteTime + noteDuration > segmentLength) {
                // Prevent segment notes from exceeding segment
                break;
            }

            if (noteTime > leftMostTime) leftMostTime = noteTime;

            segment.push({
                midi:
                    baseNote +
                    noteKeys[baseSemi][
                        Math.round(randRange(0, noteKeys[baseSemi].length))
                    ],
                time: noteTime,
                duration: noteDuration,
            });
        }

        segments.push(segment);
    }

    // Construct melody from segments and segment structure
    const melody: INote[] = [];
    let timeOffset = 0;

    for (const index of segmentStructure) {
        melody.push(
            ...segments[index].map((note) => ({
                ...note,
                time: note.time + timeOffset,
            }))
        );

        timeOffset += segmentLength;
    }

    return melody;
}

function makePart(song: ISong) {
    return makeMelody(song);
}

function makeSong(song: ISong) {
    const midi = new Midi();
    midi.header.setTempo(song.bpm);
    const track = midi.addTrack();

    //for (const segment of song.structure) {
    const part = makePart(song);

    for (const item of part) {
        track.addNote({
            midi: item.midi,
            time: item.time,
            duration: item.duration,
        });
    }
    //}

    return midi;
}

const completeSong = makeSong(song);

const fileName = `./outputs/${dayjs().format("YYYY-MM-DD[_]HH-mm")}.mid`;

console.log("Song output to: ", fileName);

fs.writeFileSync(fileName, Buffer.from(completeSong.toArray()));
