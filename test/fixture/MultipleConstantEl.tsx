import * as React from "react";
export interface Props {
  className?: string;
}
export function Foo(props: Props) {
  return (
    <div className={props.className}>
      <img src="" hidden={false} width={1} srcSet={"test 200px"} />
      <br />
      <img src="" hidden width={1} srcSet={"test 200px"} />
    </div>
  );
}
