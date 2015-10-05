var key = "two";

({
  spec: {
    render: function render() {
      var _n = document.createElement("div");

      _n.className = "my-class";
      return _n;
    }
  },
  _node: null
});

({
  spec: {
    render: function render() {
      var _n = document.createElement("div");

      return _n;
    }
  },
  _node: null,
  key: "one"
});

({
  spec: {
    render: function render() {
      var _n = document.createElement("div");

      return _n;
    }
  },
  _node: null,
  key: key
});
