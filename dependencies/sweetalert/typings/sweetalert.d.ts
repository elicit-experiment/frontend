// the 'real' TS bindings don't work in this project, I have no idea why

/*
import { SweetAlert } from "./core";

declare global {
  const swal: SweetAlert;
  const sweetAlert: SweetAlert;
}

export default swal;
export as namespace swal;
*/
declare var swal:any;

declare module "sweetalert" {
  export = swal;
}