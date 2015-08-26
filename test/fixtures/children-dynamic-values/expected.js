var message1 = "hello";
var message2 = "world";

({
  node: null,
  template: {
    el: "div",
    children: [0, {
      el: "span",
      children: [1]
    }]
  },
  values: [message1, message2]
});
