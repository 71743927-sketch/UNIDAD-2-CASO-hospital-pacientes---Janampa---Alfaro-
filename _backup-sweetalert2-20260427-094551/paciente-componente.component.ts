import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith } from 'rxjs';
import { PacienteService } from '../../services/paciente.service';

@Component({
  selector: 'app-paciente-componente',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './paciente-componente.component.html',
  styleUrl: './paciente-componente.component.css'
})
export class PacienteComponenteComponent {
  private readonly fb = inject(FormBuilder);
  private readonly pacienteService = inject(PacienteService);

  readonly pacientes = this.pacienteService.pacientes;
  readonly totalPacientes = this.pacienteService.totalPacientes;
  readonly cuposDisponibles = this.pacienteService.cuposDisponibles;
  readonly limiteAlcanzado = this.pacienteService.limiteAlcanzado;

  readonly modoEdicion = signal(false);
  readonly pacienteEditandoId = signal<number | null>(null);
  readonly mensaje = signal('');
  readonly tipoMensaje = signal<'success' | 'danger' | ''>('');

  readonly form = this.fb.nonNullable.group({
    dni: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
    nombres: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    apellidos: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    edad: [0, [Validators.required, Validators.min(0), Validators.max(120)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]],
    diagnostico: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]]
  });

  // Señales derivadas desde Reactive Forms
  readonly formularioValor = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() }
  );

  readonly formularioEstado = toSignal(
    this.form.statusChanges.pipe(startWith(this.form.status)),
    { initialValue: this.form.status }
  );

  readonly formularioTocado = signal(false);

  readonly tituloFormulario = computed(() =>
    this.modoEdicion() ? 'Editar paciente' : 'Registrar paciente'
  );

  readonly textoBoton = computed(() =>
    this.modoEdicion() ? 'Actualizar paciente' : 'Registrar paciente'
  );

  readonly formularioValido = computed(() => this.formularioEstado() === 'VALID');

  readonly sePuedeGuardar = computed(() => {
    if (!this.formularioValido()) {
      return false;
    }

    if (this.modoEdicion()) {
      return true;
    }

    return !this.limiteAlcanzado();
  });

  readonly diagnosticoCaracteres = computed(() =>
    (this.formularioValor().diagnostico ?? '').trim().length
  );

  readonly resumenPaciente = computed(() => {
    const valor = this.formularioValor();
    const nombres = (valor.nombres ?? '').trim();
    const apellidos = (valor.apellidos ?? '').trim();
    const dni = (valor.dni ?? '').trim();

    const nombreCompleto = `${nombres} ${apellidos}`.trim();

    if (!nombreCompleto && !dni) {
      return 'Complete el formulario para ver la vista previa del paciente.';
    }

    return `Vista previa: ${nombreCompleto || 'Sin nombre'} | DNI: ${dni || 'Sin DNI'}`;
  });

  readonly estadoSemaforo = computed(() => {
    if (!this.formularioTocado()) {
      return 'secondary';
    }

    return this.formularioValido() ? 'success' : 'danger';
  });

  guardar(): void {
    this.formularioTocado.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mostrarMensaje('Complete correctamente todos los campos.', 'danger');
      return;
    }

    const payload = this.form.getRawValue();

    if (this.modoEdicion() && this.pacienteEditandoId() !== null) {
      const resultado = this.pacienteService.actualizar(this.pacienteEditandoId()!, payload);
      this.mostrarMensaje(resultado.mensaje, resultado.ok ? 'success' : 'danger');

      if (resultado.ok) {
        this.cancelarEdicion(false);
      }

      return;
    }

    const resultado = this.pacienteService.agregar(payload);
    this.mostrarMensaje(resultado.mensaje, resultado.ok ? 'success' : 'danger');

    if (resultado.ok) {
      this.limpiarFormulario();
    }
  }

  editar(id: number): void {
    const paciente = this.pacienteService.obtenerPorId(id);

    if (!paciente) {
      this.mostrarMensaje('Paciente no encontrado.', 'danger');
      return;
    }

    this.form.patchValue({
      dni: paciente.dni,
      nombres: paciente.nombres,
      apellidos: paciente.apellidos,
      edad: paciente.edad,
      telefono: paciente.telefono,
      diagnostico: paciente.diagnostico
    });

    this.modoEdicion.set(true);
    this.pacienteEditandoId.set(id);
    this.formularioTocado.set(true);
    this.mostrarMensaje('Modo edicion activado.', 'success');
  }

  eliminar(id: number): void {
    const resultado = this.pacienteService.eliminar(id);
    this.mostrarMensaje(resultado.mensaje, resultado.ok ? 'success' : 'danger');

    if (this.pacienteEditandoId() === id) {
      this.cancelarEdicion(false);
    }
  }

  cancelarEdicion(limpiarMensaje: boolean = true): void {
    this.modoEdicion.set(false);
    this.pacienteEditandoId.set(null);
    this.limpiarFormulario();

    if (limpiarMensaje) {
      this.mensaje.set('');
      this.tipoMensaje.set('');
    }
  }

  esInvalido(campo: 'dni' | 'nombres' | 'apellidos' | 'edad' | 'telefono' | 'diagnostico'): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.dirty || control.touched);
  }

  private limpiarFormulario(): void {
    this.form.reset({
      dni: '',
      nombres: '',
      apellidos: '',
      edad: 0,
      telefono: '',
      diagnostico: ''
    });
    this.formularioTocado.set(false);
    this.modoEdicion.set(false);
    this.pacienteEditandoId.set(null);
  }

  private mostrarMensaje(texto: string, tipo: 'success' | 'danger'): void {
    this.mensaje.set(texto);
    this.tipoMensaje.set(tipo);
  }
}
