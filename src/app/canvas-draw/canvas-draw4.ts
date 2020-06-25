import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FontTileComponent } from './font-tile.component';

describe('FontTileComponent', () => {
  let component: FontTileComponent;
  let fixture: ComponentFixture<FontTileComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FontTileComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FontTileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
