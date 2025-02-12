export interface WorkItem {
  id: string;
  type: string;
  height: string;
  width: string;
  unit_of_length: string;
  option: string;
  quantity: number;
  total: number;
  remark: string;
}

export interface Payment {
  total: number;
  deposit: number;
  date_of_payment: Date;
  payment_method: string;
  remaining: number;
}

export interface Job {
  id: string;
  serial_number: string;
  contact: string;
  customer_name: string;
  phone: string;
  line_name: string;
  created_at: Date;
  created_by: string;
  seller_name: string;
  work: WorkItem[];
  other: string;
  payment: Payment;
  status: string;
  remark: string;
  design_by: string;
  design_date: string;
  modify: number;
  confirm_by: string;
  confirm_date: string;
  print_by: string;
  print_date: string;
  is_urgent: boolean;
  date_of_acceptance: Date | string;
  date_of_submission: string;
  date_of_send_production: string;
  date_of_completion: string;
  worksheet_image: string;
  reference_images: string[];
  design_images: string[];
  print_images: string[];
} 