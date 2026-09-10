import { describe, expect, it } from 'vitest'
import { createInpDemoCohorts } from './inp-demo-scenarios.js'

describe('createInpDemoCohorts', () => {
    it('creates isolated, fully attributed INP scenarios', () => {
        const cohorts = createInpDemoCohorts(Date.UTC(2026, 8, 10))
        expect(cohorts).toHaveLength(4)
        expect(cohorts.map(({ scenario }) => scenario.expectedRuleIds)).toEqual([
            ['inp.high-input-delay'],
            ['inp.slow-event-handler'],
            ['inp.high-presentation-delay'],
            ['inp.slow-event-handler', 'inp.repeated-interaction-target'],
        ])
        for (const cohort of cohorts) {
            expect(cohort.events).toHaveLength(cohort.scenario.sampleCount)
            expect(cohort.events.every((event) =>
                event.type === 'web.vital.inp' &&
                event.payload.attribution !== undefined
            )).toBe(true)
        }
        const repeated = cohorts[3]!
        expect(new Set(repeated.events.map((event) =>
            event.type === 'web.vital.inp'
                ? event.payload.attribution?.interactionTarget
                : undefined
        ))).toEqual(new Set(['#inp-demo']))
    })
})
