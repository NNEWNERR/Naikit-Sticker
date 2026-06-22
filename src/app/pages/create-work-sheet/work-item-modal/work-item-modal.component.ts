import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from 'src/app/services/modal.service';
import { v4 as uuidv4 } from 'uuid';
import {
  WORK_ITEM_TYPES,
  UNIT_OPTIONS,
  optionsForType,
  typeHasPresetOptions,
} from 'src/app/core/data/work-item-catalog';

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
            unit_of_length: ['ซม.' ],
            option: [''],
            quantity: [''],
            total: [''],
            remark: ['']
        });

        this.workItemForm.get('type')?.valueChanges.subscribe(type => {
            this.workItemForm.patchValue({ option: '' });
        });
    }


    // dropdown source เดียวจาก core/data/work-item-catalog (ตรง canonical กับ BE pricing.ts — F7)
    getWorkItemTypes() {
        return WORK_ITEM_TYPES;
    }

    getUnitOptions() {
        return UNIT_OPTIONS;
    }

    getWorkItemOptions(type: string) {
        return optionsForType(type);
    }

    hasPresetOptions(type: string): boolean {
        return typeHasPresetOptions(type);
    }

    dismiss() {
        this.modalController.dismiss();
    }

    closeModal() { this.modalController.dismiss(); }

    async save() {
        if (this.workItemForm.valid) {
            this.modalController.dismiss(this.workItemForm.value);
        }
    }
} 