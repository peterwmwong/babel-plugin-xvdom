var list = [1, 2, 3];

({
  node: null,
  template: {
    el: "div",
    children: [0]
  },
  values: [list.map(function (el) {
    return {
      node: null,
      template: {
        el: "span",
        children: [0]
      },
      values: [el]
    };
  })]
});
