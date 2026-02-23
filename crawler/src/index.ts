import { Effect } from 'effect'
import { execute } from '@/core/engine'
import { STAGES } from '@/config'

const program = execute(STAGES)

Effect.runPromise(program)
  .then((data) => {
    console.log('Complete:', data)
  })
  .catch((error) => {
    console.error('Error:', error)
  })
