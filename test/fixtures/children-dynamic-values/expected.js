var message1 = "hello";
var message2 = "world";

({
  spec: {
    render: function render(inst) {
      var _n = document.createElement("div"),
          _n2;

      _n.appendChild(xvdom.createDynamic(inst.v0, inst, "r0", "c0"));

      _n2 = document.createElement("span");

      _n2.appendChild(xvdom.createDynamic(inst.v1, inst, "r1", "c1"));

      _n.appendChild(_n2);

      return _n;
    },
    rerender: function rerender(inst, pInst) {
      if (inst.v0 !== pInst.v0) {
        pInst.r0(inst.v0, pInst.v0, pInst.c0, pInst, "r0", "c0");
        pInst.v0 = inst.v0;
      }

      if (inst.v1 !== pInst.v1) {
        pInst.r1(inst.v1, pInst.v1, pInst.c1, pInst, "r1", "c1");
        pInst.v1 = inst.v1;
      }
    }
  },
  _node: null,
  v0: message1,
  r0: null,
  c0: null,
  v1: message2,
  r1: null,
  c1: null
});
