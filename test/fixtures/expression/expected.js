var msg = "hello";
function translate(str) {
  return str;
}

({
  node: null,
  template: {
    el: "div",
    props: {
      className$: 0
    }
  },
  values: [msg]
});

({
  node: null,
  template: {
    el: "div",
    props: {
      className$: 0,
      title$: 1
    }
  },
  values: [msg + "hello", translate(msg)]
});

({
  node: null,
  template: {
    el: "div",
    children: [0]
  },
  values: [msg]
});

({
  node: null,
  template: {
    el: "div",
    children: [0]
  },
  values: [msg + "hello"]
});

({
  node: null,
  template: {
    el: "div",
    children: [0]
  },
  values: [translate(msg)]
});
