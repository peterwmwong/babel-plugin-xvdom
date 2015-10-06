var list = [1, 2, 3];
var id = "blah";

({
  spec: {
    render: function render(inst) {
      var _n = document.createElement("div");

      _n.id = inst.v0;

      _n.appendChild(xvdom.createDynamic(inst.v1, inst, "r1", "c1"));

      return _n;
    },
    rerender: function rerender(inst, pInst) {
      if (inst.v0 !== pInst.v0) {
        pInst.c0.id = inst.v0;
        pInst.v0 = inst.v0;
      }

      if (inst.v1 !== pInst.v1) {
        pInst.r1(inst.v1, pInst.v1, pInst.c1, pInst, "r1", "c1");
        pInst.v1 = inst.v1;
      }
    }
  },
  _node: null,
  v0: id,
  r0: null,
  c0: null,
  v1: list.map(function (el) {
    return {
      spec: {
        render: function render(inst) {
          var _n = document.createElement("span");

          _n.appendChild(xvdom.createDynamic(inst.v0, inst, "r0", "c0"));

          return _n;
        },
        rerender: function rerender(inst, pInst) {
          if (inst.v0 !== pInst.v0) {
            pInst.r0(inst.v0, pInst.v0, pInst.c0, pInst, "r0", "c0");
            pInst.v0 = inst.v0;
          }
        }
      },
      _node: null,
      v0: el,
      r0: null,
      c0: null
    };
  }),
  r1: null,
  c1: null
});
