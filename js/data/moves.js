// Move catalogue: names, placeholder pose, how-to text. Names for the original moves come from the generated data.
import { ORIGINAL } from './original-plans.js';

// Our own moves for Expert / Master (see plan-engine.md)
const NEW = {
  'long-lever-plank': ['Long-lever plank', 'Forearm plank with your elbows a hand-width ahead of your shoulders. Longer lever, harder hold. Keep ribs down and glutes tight.'],
  'plank-shoulder-taps': ['Plank shoulder taps', 'From a straight-arm plank, tap each hand to the opposite shoulder. Keep your hips still, like a glass of water on your back.'],
  'side-plank-hip-dips-left': ['Side plank hip dips left', 'Left forearm side plank. Lower your hip toward the floor, then lift back to a straight line.'],
  'side-plank-hip-dips-right': ['Side plank hip dips right', 'Right forearm side plank. Lower your hip toward the floor, then lift back to a straight line.'],
  'star-side-plank-left': ['Star side plank left', 'Left side plank with your top arm and top leg both lifted into a star.'],
  'star-side-plank-right': ['Star side plank right', 'Right side plank with your top arm and top leg both lifted into a star.'],
  'plank-up-downs': ['Plank up-downs', 'Move from forearms to straight arms and back, one arm at a time. Keep your hips level.'],
  'spiderman-plank': ['Spiderman plank', 'In a plank, bring one knee to the same-side elbow, back, then switch. Hips stay low.'],
  'kneeling-copenhagen-side-plank-left': ['Kneeling Copenhagen side plank left', 'Left side plank with your top knee on a chair or bed edge. Lift your hips and hold.'],
  'kneeling-copenhagen-side-plank-right': ['Kneeling Copenhagen side plank right', 'Right side plank with your top knee on a chair or bed edge. Lift your hips and hold.'],
  'hollow-body-hold': ['Hollow body hold', 'Lie on your back, press your lower back down, lift arms and legs off the floor and hold.'],
  'rkc-plank': ['RKC plank', 'Short, hard plank: squeeze your fists, glutes and abs as tight as you can. Short rounds, full effort.'],
  'copenhagen-side-plank-left': ['Copenhagen side plank left', 'Left side plank with your top foot on a chair. Lift your hips into a straight line and hold.'],
  'copenhagen-side-plank-right': ['Copenhagen side plank right', 'Right side plank with your top foot on a chair. Lift your hips into a straight line and hold.'],
  'single-arm-single-leg-plank-left': ['Single-arm single-leg plank left', 'Plank with the left arm and the opposite leg lifted. Hold still.'],
  'single-arm-single-leg-plank-right': ['Single-arm single-leg plank right', 'Plank with the right arm and the opposite leg lifted. Hold still.'],
  'body-saw': ['Body saw', 'Forearm plank. Rock your body forward and back a few centimetres, like a saw, without letting your hips sag.'],
  'plank-to-pike': ['Plank to pike', 'From a straight-arm plank, lift your hips up into an upside-down V, then lower back.'],
  'long-lever-single-leg-plank-left': ['Long-lever single-leg plank left', 'Long-lever plank with the left leg lifted off the mat.'],
  'long-lever-single-leg-plank-right': ['Long-lever single-leg plank right', 'Long-lever plank with the right leg lifted off the mat.'],
  'weighted-plank': ['Weighted plank', 'Plank with a light backpack on your back. Optional; can be swapped in Settings.'],
};

const NAMES = { ...ORIGINAL.moveNames };
for (const [id, [n]] of Object.entries(NEW)) NAMES[id] = n;
const DESC = { ...ORIGINAL.moveDesc };
for (const [id, [, d]] of Object.entries(NEW)) DESC[id] = d;

Object.assign(NAMES, {
  'head-tilt': 'Head tilt', 'wrists-and-ankles-stretch-left': 'Wrists & ankles stretch left', 'wrists-and-ankles-stretch-right': 'Wrists & ankles stretch right',
  'bent-arm-circles': 'Bent arm circles', 'dynamic-chest': 'Dynamic chest', 'knee-to-elbow-crunches': 'Knee to elbow crunches',
  'cat-cow-pose': 'Cat cow pose', 'shoulder-stretch': 'Shoulder stretch', 'triceps-stretch-left': 'Triceps stretch left', 'triceps-stretch-right': 'Triceps stretch right',
  'clasp-hands-behind-back': 'Clasp hands behind back', 'standing-biceps-stretch-left': 'Standing biceps stretch left', 'standing-biceps-stretch-right': 'Standing biceps stretch right',
  'max-plank-test': 'Max plank test',
});
DESC['max-plank-test'] = 'Test day. Hold your best plank for as long as you can with good form, then slide to complete. It counts as your Challenge record.';
export function moveName(id) { return NAMES[id] || id.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()); }
export function moveDesc(id) { return DESC[id] || 'Follow the picture and the voice coach. Move slowly and breathe.'; }
export function movePose(id) {
  if (/side-plank|copenhagen/.test(id)) return 'side';
  if (/plank|push-up|saw|spiderman|up-downs|pike|hold/.test(id) && !/hollow/.test(id)) return 'plank';
  return 'stretch';
}
export function isOneSided(id) { return /(-left|-right)$/.test(id) || /left|right/.test(id); }
/** Rough kcal per minute for the report. Planks are modest; HIIT higher. */
export function kcalPerMin(id) { return /jump|burpee|mountain|kick|high-step|jacks|squat-thrust|spider/.test(id) ? 9 : /plank|hold|saw/.test(id) ? 4 : 3; }
export const ALL_MOVE_IDS = () => Object.keys(NAMES);
