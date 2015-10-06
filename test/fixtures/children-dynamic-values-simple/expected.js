var message1 = "hello";

({
  spec: {
    render: function render(inst) {
      var _n = document.createElement("div");

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
  v0: message1,
  r0: null,
  c0: null
});
