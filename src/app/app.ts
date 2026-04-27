import { Component } from '@angular/core';
import { PacienteComponenteComponent } from './components/paciente-componente/paciente-componente.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PacienteComponenteComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
}
