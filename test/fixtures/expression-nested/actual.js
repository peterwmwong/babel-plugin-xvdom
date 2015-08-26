const list = [1, 2, 3];
const id="blah";

<div id={id}>
  {
    list.map(el=>
      <span>{el}</span>
    )
  }
</div>;
