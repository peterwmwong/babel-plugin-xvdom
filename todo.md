
## Refactor Dynamics

- Problem: Instance Params
  1. Rename to Instance Property
  2. Overly complex property name assignment (ex. `inst.a`)
    - _generateInstanceParamId() could just be an integer index 