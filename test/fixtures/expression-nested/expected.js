var list = [1, 2, 3];
var id = "blah";

({
  node: null,
  template: {
    el: "div",
    props: {
      id$: 0
    },
    children: [1]
  },
  values: [id, list.map(function (el) {
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
