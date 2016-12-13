
## Code generation: type the code code generation context (see generateSpecCreateCode()'s context)

Currently it's a POJO and left to the user's to manipulate and uphold contstraints.
Now that we know how these context properties are being manipulated (and the intent),
lets build intent oriented manipulation methods.

  - `tmpVars`
    - Problems
      - It's not clear how/what can be added `tmpVars`
      - Hidden constraint: must be unique!
      - Reliance on seemingly unrelated `getTmpVar` and `getTmpVarNode` methods
    - Solution
      - `context.genTmpVar()`
      - `context.getOrGenTmpVarFor(key)`
  - `instanceParamId` and `prevInstanceParamId`
    - Problems
      - We have to guess upfront with odd heuristics (does the fragment contain any custom elements?)
        to determine whether we need the instance or previous instance params
      - Code generation should dictate the need based on request
    - Solution
      - `context.getInstanceId`
      - `context.getPrevInstanceId`
  - `xvdomApi`

## Code generation: destructure function params less

- Turns out this makes it hard to follow which object is being passed

## Extract Multi-Source Shortest Path algorithm out

## Fix disabled cloneable-saved-path-nodes

## Refactor Dynamics

- Problem: Instance Params
  1. Rename to Instance Property
  2. Overly complex property name assignment (ex. `inst.a`)
    - _generateInstanceParamId() could just be an integer index 

## Consider templatizing code generation