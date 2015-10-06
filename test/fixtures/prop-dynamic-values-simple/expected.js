var messageType = "unread";

({
  spec: {
    render: function render(inst) {
      var _n = document.createElement("div");

      _n.className = inst.v0;
      return _n;
    },
    rerender: function rerender(inst, pInst) {
      if (inst.v0 !== pInst.v0) {
        pInst.c0.className = inst.v0;
        pInst.v0 = inst.v0;
      }
    }
  },
  _node: null,
  v0: messageType,
  r0: null,
  c0: null
});
