import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { v4 as uuidv4 } from 'uuid';

@Component({
    selector: 'app-work-item-modal',
    templateUrl: './work-item-modal.component.html',
    styleUrls: ['./work-item-modal.component.scss'],
})
export class WorkItemModalComponent implements OnInit {
    workItemForm: FormGroup;
    editData: any;

    constructor(
        private fb: FormBuilder,
        private modalController: ModalController
    ) {
        this.initForm();
    }

    ngOnInit() {
        if (this.editData) {
            this.workItemForm.patchValue(this.editData);
        }
    }

    private initForm() {
        this.workItemForm = this.fb.group({
            id: [uuidv4()],
            type: ['ไวนิล', Validators.required],
            height: ['' ],
            width: [''],
            unit_of_length: ['cm.' ],
            option: [''],
            quantity: [''],
            total: [''],
            remark: ['']
        });

        this.workItemForm.get('type')?.valueChanges.subscribe(type => {
            this.workItemForm.patchValue({ option: '' });
        });
    }


    getWorkItemTypes() {
        return [
            { value: 'ไวนิล', label: 'ไวนิล' },
            { value: 'สติกเกอร์', label: 'สติกเกอร์ พิมพ์' },
            { value: 'สติกเกอร์ตัด', label: 'สติกเกอร์ ตัด' },
            { value: 'ฉลาก', label: 'ฉลาก' },
            { value: 'นามบัตร', label: 'นามบัตร' },
            { value: 'ใบปลิว', label: 'ใบปลิว' },
            { value: 'โปสเตอร์', label: 'โปสเตอร์' },
            { value: 'พลาสวูด', label: 'พลาสวูด' },
            { value: 'ตรายาง', label: 'ตรายาง' },
            { value: 'กล่องไฟ', label: 'กล่องไฟ' }
        ];
    }

    getUnitOptions() {
        return [
            { value: 'มม.', label: 'มม.' },
            { value: 'ซม.', label: 'ซม.' },
            { value: 'นิ้ว', label: 'นิ้ว' },
            { value: 'เมตร', label: 'เมตร' }
        ];
    }

    getWorkItemOptions(type: string) {
        const optionMap: { [key: string]: { value: string, label: string }[] } = {
            'ไวนิล': [
                { value: 'ตาไก่', label: 'ตาไก่' },
                { value: 'ร้อยท่อ', label: 'ร้อยท่อ' },
                { value: 'โครงไม้', label: 'โครงไม้' },
                { value: 'พับขอบ', label: 'พับขอบ' },
                { value: 'ปล่อยขอบ', label: 'ปล่อยขอบ' },
                { value: 'โครงเหล็ก', label: 'โครงเหล็ก' },
                { value: 'กรอบไม้', label: 'กรอบไม้' }
            ],
            'สติกเกอร์': [
                { value: 'ติดฟิวเจอร์บอร์ด', label: 'ติดฟิวเจอร์บอร์ด' },
                { value: 'ติดอะคริลิค', label: 'ติดอะคริลิค' },
                { value: 'ติดพลาสวูด', label: 'ติดพลาสวูด' }
            ],
            'สติกเกอร์ตัด': [
                { value: 'ติดฟิวเจอร์บอร์ด', label: 'ติดฟิวเจอร์บอร์ด' },
                { value: 'ติดอะคริลิค', label: 'ติดอะคริลิค' },
                { value: 'ติดพลาสวูด', label: 'ติดพลาสวูด' }
            ],
            'ตรายาง': [
                { value: 'Q-04', label: 'Q-04(4x60 MM.)' },
                { value: 'Q-05', label: 'Q-05(11x25 MM.)' },
                { value: 'Q-10', label: 'Q-10(11x40 MM.)' },
                { value: 'Q-11', label: 'Q-11(16x48 MM.)' },
                { value: 'Q-12', label: 'Q-12(24x49 MM.)' },
                { value: 'Q-13', label: 'Q-13(13x49 MM.)' },
                { value: 'Q-14', label: 'Q-14(14x60 MM.)' },
                { value: 'Q-16', label: 'Q-16(36x61 MM.)' },
                { value: 'Q-18', label: 'Q-18(22x69 MM.)' },
                { value: 'Q-24', label: 'Q-24(28x78 MM.)' },
                { value: 'Q-26', label: 'Q-26(16x83 MM.)' },
                { value: 'Q-32', label: 'Q-32(16 MM.)' },
                { value: 'Q-34', label: 'Q-34(20 MM.)' },
                { value: 'Q-53', label: 'Q-53(38 MM.)' }
            ]
        };
        return optionMap[type] || [];
    }

    hasPresetOptions(type: string): boolean {
        return ['ไวนิล', 'สติกเกอร์', 'สติกเกอร์ตัด', 'ตรายาง'].includes(type);
    }

    dismiss() {
        this.modalController.dismiss();
    }

    async save() {
        if (this.workItemForm.valid) {
            this.modalController.dismiss(this.workItemForm.value);
        }
    }
} 