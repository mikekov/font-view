import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CharmapComponent } from './charmap.component';

describe('CharmapComponent', () => {
  let component: CharmapComponent;
  let fixture: ComponentFixture<CharmapComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CharmapComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CharmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
