var key = "two";

({
  node: null,
  template: {
    el: "div",
    props: {
      "class": "my-class"
    }
  }
});

({
  node: null,
  template: {
    el: "div"
  },
  key: "one"
});

({
  node: null,
  template: {
    el: "div"
  },
  key: key
});
