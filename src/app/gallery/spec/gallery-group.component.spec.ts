/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { GalleryGroupComponent } from '../gallery-group.component';

describe('GalleryGroupComponent', () => {
	let component: GalleryGroupComponent;
	let fixture: ComponentFixture<GalleryGroupComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ GalleryGroupComponent ]
		})
		.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(GalleryGroupComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
