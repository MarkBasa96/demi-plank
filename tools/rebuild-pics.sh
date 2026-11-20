#!/bin/bash
# Rebuilds every picture from the saved sheets (in the vault: 03-outputs/pictures/sheets). Run from the repo root.
B="PATH-TO-VAULT/03-projects/plank-workout/03-outputs/pictures"
M="node tools/make-pics.mjs"
rm -f pics/*.webp
$M "$B/reference/option-B.png" 1x1 plank
$M "$B/sheets/sheet-01-planks.png" 2x2 straight-arm-plank,knee-plank,side-plank-left\>side-plank-right,-
$M "$B/sheets/sheet-02.png" 2x4 bird-dog,kneeling-side-plank-left\>kneeling-side-plank-right,-,-,star-side-plank-left\>star-side-plank-right,-,-,leg-raised-plank-left\>leg-raised-plank-right
$M "$B/sheets/sheet-03.png" 2x2 -,wide-arm-plank,push-up-hold,straight-arm-knee-plank
$M "$B/sheets/sheet-05.png" 2x2 plank-with-left-arm-lift\>plank-with-right-arm-lift,diagonal-plank-hold-left\>diagonal-plank-hold-right,long-lever-plank,plank-shoulder-taps
$M "$B/sheets/sheet-06.png" 2x2 -,modified-push-up-low-hold,-,leg-up-side-plank-left\>leg-up-side-plank-right
$M "$B/sheets/sheet-07.png" 2x2 copenhagen-side-plank-left\>copenhagen-side-plank-right,kneeling-copenhagen-side-plank-left\>kneeling-copenhagen-side-plank-right,body-saw,hollow-body-hold
$M "$B/sheets/sheet-08-warmup.png" 2x2 head-tilt,bent-arm-circles,dynamic-chest,knee-to-elbow-crunches
$M "$B/sheets/sheet-09-cooldown.png" 2x2 cobra-stretch,cat-cow-pose,shoulder-stretch,triceps-stretch-left\>triceps-stretch-right
$M "$B/sheets/sheet-10-stretch.png" 2x2 wrists-and-ankles-stretch-left\>wrists-and-ankles-stretch-right,clasp-hands-behind-back,standing-biceps-stretch-left\>standing-biceps-stretch-right,child-s-pose
$M "$B/sheets/sheet-11-hiit.png" 2x2 jumping-jacks,butt-kicks,high-stepping,bridge
$M "$B/sheets/sheet-12-moving.png" 2x2 -,spiderman-plank,mountain-climber,downward-facing-dog
$M "$B/sheets/sheet-13-crunch.png" 2x2 abdominal-crunches,bicycle-crunches,sit-ups,leg-raises
$M "$B/sheets/sheet-14-core.png" 2x2 flutter-kicks,reclined-oblique-twist,v-hold,reverse-crunches
$M "$B/sheets/sheet-15-redo.png" 2x2 "-,head-tilt,triceps-stretch-left>triceps-stretch-right,shoulder-stretch"
$M "$B/sheets/sheet-16-chatgpt-stretch.png" 2x2 "left-quad-stretch-with-wall>right-quad-stretch-with-wall,calf-stretch-left>calf-stretch-right,sitting-hamstring-stretch-left>sitting-hamstring-stretch-right,lying-butterfly-stretch"
$M "$B/sheets/sheet-17-chatgpt-stretch2.png" 2x2 "lying-twist-stretch-left>lying-twist-stretch-right,cross-leg-side-bend-left>cross-leg-side-bend-right,backward-lunge,quarter-wall-squat"
$M "$B/sheets/sheet-18-chatgpt-legs.png" 2x2 "open-chain-knee-extension-left>open-chain-knee-extension-right,straight-leg-raise-left>straight-leg-raise-right,pilates-clamshell-left>pilates-clamshell-right,overhead-arm-clockwise-circles>overhead-arm-counterclockwise-circles"
$M "$B/sheets/sheet-19-chatgpt-standing.png" 2x2 "standing-side-bend,triangle-pose-left>triangle-pose-right,torso-twist,chest-stretch"
$M "$B/sheets/sheet-20-flow-hiit1.jpg" 2x2 "quick-feet,modified-burpees,jumping-squats,heel-touch"
$M "$B/sheets/sheet-21-flow-hiit2.jpg" 2x2 "punches,plank-jacks,fast-spider-lunges,x-burpees"
$M "$B/sheets/sheet-22-flow-abs.jpg" 2x2 "x-man-crunch,crunch-kicks,heels-to-the-heavens,sit-up-twist"
$M "$B/sheets/sheet-23-flow-abs2.jpg" 2x2 "alternating-hooks,one-down-two-ups,seated-abs-clockwise-circles,seated-abs-counterclockwise-circles"
$M "$B/sheets/sheet-24-flow-reverse.jpg" 2x2 "reverse-plank,reverse-plank-with-left-leg-raised,reverse-plank-with-right-leg-raised,plank-hip-dips"
$M "$B/sheets/sheet-25-flow-dedicated1.jpg" 2x2 "plank-up-downs,plank-to-pike,mountain-climber-squat-thrust,russian-twist"
$M "$B/sheets/sheet-26-flow-dedicated2.jpg" 2x2 "v-crunch,alt-v-up,rkc-plank,weighted-plank"
$M "$B/sheets/sheet-27-flow-dedicated3.jpg" 2x2 "long-lever-single-leg-plank-left>long-lever-single-leg-plank-right,side-plank-hip-dips-left>side-plank-hip-dips-right,wide-arm-plank,standing-biceps-stretch-left>standing-biceps-stretch-right"
cd pics
# same-pose aliases (honest approximations; replace with dedicated art when it exists)
cp diagonal-plank-hold-left.webp single-arm-single-leg-plank-left.webp; cp diagonal-plank-hold-right.webp single-arm-single-leg-plank-right.webp
cp plank-with-left-arm-lift.webp plank-and-reach-left.webp; cp plank-with-right-arm-lift.webp plank-and-reach-right.webp
cp leg-raised-plank-left.webp single-left-leg-plank.webp; cp leg-raised-plank-right.webp single-right-leg-plank.webp
cp plank.webp max-plank-test.webp
cp side-plank-left.webp left-side-plank-with-arm-raised.webp; cp side-plank-right.webp right-side-plank-with-arm-raised.webp
cp leg-up-side-plank-left.webp side-plank-with-left-leg-raised.webp; cp leg-up-side-plank-right.webp side-plank-with-right-leg-raised.webp
cp jumping-jacks.webp star-jumps.webp; cp bridge.webp butt-bridge.webp
cp reverse-crunches.webp reverse-crunches-with-leg-raised.webp
