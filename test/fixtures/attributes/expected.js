var key = "two";

({
  spec: {
    render: function render() {
      var node,
          root = (node = document.createElement("div"), node.className = "my-class", node);
      return root;
    }
  },
  _node: null
});

({
  spec: {
    render: function render() {
      return document.createElement("div");
    }
  },
  _node: null,
  key: "one"
});

({
  spec: {
    render: function render() {
      return document.createElement("div");
    }
  },
  _node: null,
  key: key
});
