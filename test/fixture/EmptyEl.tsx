import * as React from "react";
export interface Props {
  className?: string;
}
export function Foo(props: Props) {
  return (
    <div className={props.className}>
      <br />
    </div>
  );
}
