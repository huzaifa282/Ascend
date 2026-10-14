# Ruleset reference

Generated from `packages/engine/src/ruleset.ts`. Do not edit by hand — run `pnpm gen:ruleset` after changing `DEFAULT_RULESET`.

## stats

- `statScale`: `2000`
- `neglectDays`: `5`
- `neglectDecay`: `true`

## activityXp

- `baseRate`: `1`
### intensity

- `light`: `0.8`
- `moderate`: `1`
- `hard`: `1.3`

- `durationCapMinutes`: `240`
- `statDailyCap`: `120`
- `capFactorReduced`: `0.25`

## penalty

- `factor`: `0.5`

## plausibilityFactor

- `flagged`: `0.2`
- `confirmed`: `1`

## levels

- `base`: `100`
- `perLevel`: `126`
- `roundTo`: `50`

## ranks

### bands

- `E`: `[1,9]`
- `D`: `[10,24]`
- `C`: `[25,39]`
- `B`: `[40,59]`
- `A`: `[60,79]`
- `S`: `[80,null]`

- `trialDays`: `7`
- `trialDayXp`: `90`
- `levelCapOffset`: `4`

## hp

- `max`: `100`
- `dailyLossCap`: `20`
- `dailyUndoneLoss`: `4`
- `allDoneGain`: `5`
- `dangerThreshold`: `30`
- `failedTaskBase`: `2`
- `failedTaskPerDifficulty`: `2`

## penaltyZone

- `recoveryWindowHours`: `24`
- `recoveryTasksNeeded`: `3`
- `recoveryFocusMinutes`: `60`
- `exitHp`: `30`

## shields

- `perMonth`: `2`

## tasks

### base

- `1`: `20`
- `2`: `40`
- `3`: `70`
- `4`: `110`
- `5`: `160`

### estDefaultMinutes

- `1`: `15`
- `2`: `30`
- `3`: `60`
- `4`: `120`
- `5`: `240`

- `ambitionBase`: `0.8`
- `ambitionScale`: `0.7`
- `pressureMin`: `0.02`
- `pressureMax`: `1`
- `highRiskAmbition`: `1.3`
- `highRiskMinDifficulty`: `4`
- `lowRewardAmbition`: `0.95`
- `lowRewardMaxDifficulty`: `2`
### tiers

- `earlyMinRemaining`: `0.5`
- `earlyMultiplier`: `1.25`
- `earlyScaledMinRemaining`: `0.1`
- `earlyScaledBase`: `1.1`
- `earlyScaledRange`: `0.15`
- `onTimeMultiplier`: `1.1`
- `graceWindowFraction`: `0.25`
- `graceMinMinutes`: `15`
- `graceMaxMinutes`: `120`
- `lateMultiplier`: `0.3`
- `lateWindowHours`: `24`

### reschedule

- `laterMultiplier`: `0.95`
- `floorMultiplier`: `0.7`

### emergency

- `xp`: `120`
- `hp`: `10`
- `expireHours`: `4`

### defaultStatWeights

- `DIS`: `1`


## dailies

### xpBySize

- `small`: `20`
- `medium`: `40`
- `large`: `60`
- `xlarge`: `80`

- `streakMinXp`: `30`

## timer

- `presetsMinutes`: `[25,50,90]`
- `customMinMinutes`: `5`
- `customMaxMinutes`: `180`
- `breaksMinutes`: `[5,10,15]`
- `sessionsPerCycle`: `4`
- `minCreditMinutes`: `10`
- `pauseEndsSessionAfterMinutes`: `10`
### defaultStatWeights

- `FOC`: `0.7`
- `DIS`: `0.3`


## skills

- `levelDivisor`: `50`
- `suggestionCount`: `5`
- `suggestionWindowDays`: `21`
- `suggestionDismissDays`: `60`

## plausibility

### running

- `maxSpeedKmh`: `25`
- `minSpeedKmh`: `3`

### walking

- `maxSpeedKmh`: `8`

### cycling

- `maxSpeedKmh`: `60`

### swimming

- `maxSpeedKmh`: `6`

- `maxSingleActivityHours`: `8`
- `maxDailyTotalHours`: `16`
### reading

- `maxPagesPerHour`: `150`


## titles

- `earlyRiserConsecutiveDays`: `7`
- `earlyRiserCutoffHour`: `8`
- `steadyHandTasks`: `20`
- `ironWeekDays`: `7`
- `nightOwlCutoffHour`: `1`
- `nightOwlWindowEndHour`: `5`
- `nightOwlDistinctDays`: `5`
- `marathonMindHours`: `300`
- `polymathSkillLevel`: `5`
- `polymathDistinctStats`: `4`

