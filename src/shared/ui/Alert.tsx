import Swal from 'sweetalert2';

interface AlertOptions {
  icon?: 'success' | 'error' | 'warning' | 'info' | 'question';
  title?: string;
  text?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
}

export async function showAlert(options: AlertOptions) {
  return await Swal.fire({
    icon: options.icon,
    title: options.title,
    text: options.text,
    confirmButtonText: options.confirmButtonText || 'OK',
    cancelButtonText: options.cancelButtonText || 'Cancel',
    showCancelButton: options.showCancelButton || false,
    customClass: {
      popup: 'modal-solid',
      confirmButton: 'swal-confirm-btn',
      cancelButton: 'swal-cancel-btn',
    },
    buttonsStyling: false,
  });
}
