import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith } from 'rxjs';
import Swal from 'sweetalert2';
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

  readonly form = this.fb.nonNullable.group({
    dni: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
    nombres: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    apellidos: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    edad: [0, [Validators.required, Validators.min(0), Validators.max(120)]],
    telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]],
    diagnostico: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]]
  });

  // Signals derivados desde Reactive Forms
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

  async guardar(): Promise<void> {
    this.formularioTocado.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      await Swal.fire({
        title: 'Formulario incompleto',
        text: 'Complete correctamente todos los campos.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#0d6efd'
      });
      return;
    }

    const payload = this.form.getRawValue();

    if (this.modoEdicion() && this.pacienteEditandoId() !== null) {
      const resultado = this.pacienteService.actualizar(this.pacienteEditandoId()!, payload);

      await Swal.fire({
        title: resultado.ok ? 'Paciente actualizado' : 'Error',
        text: resultado.mensaje,
        icon: resultado.ok ? 'success' : 'error',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#0d6efd'
      });

      if (resultado.ok) {
        this.cancelarEdicion();
      }

      return;
    }

    const resultado = this.pacienteService.agregar(payload);

    await Swal.fire({
      title: resultado.ok ? 'Paciente registrado' : 'No se pudo registrar',
      text: resultado.mensaje,
      icon: resultado.ok ? 'success' : 'error',
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#0d6efd'
    });

    if (resultado.ok) {
      this.limpiarFormulario();
    }
  }

  async editar(id: number): Promise<void> {
    const paciente = this.pacienteService.obtenerPorId(id);

    if (!paciente) {
      await Swal.fire({
        title: 'Paciente no encontrado',
        text: 'No se pudo cargar la informacion del paciente.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#dc3545'
      });
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

    await Swal.fire({
      title: 'Modo edicion activado',
      text: 'Ahora puede actualizar los datos del paciente.',
      icon: 'info',
      confirmButtonText: 'Continuar',
      confirmButtonColor: '#0d6efd',
      timer: 1600,
      timerProgressBar: true
    });
  }

  async eliminar(id: number): Promise<void> {
    const paciente = this.pacienteService.obtenerPorId(id);

    if (!paciente) {
      await Swal.fire({
        title: 'Paciente no encontrado',
        text: 'No existe el paciente que desea eliminar.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#dc3545'
      });
      return;
    }

    const confirmacion = await Swal.fire({
      title: '¿Eliminar paciente?',
      text: `Se eliminara a ${paciente.nombres} ${paciente.apellidos}. Esta accion no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Si, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      reverseButtons: true
    });

    if (!confirmacion.isConfirmed) {
      await Swal.fire({
        title: 'Operacion cancelada',
        text: 'El paciente no fue eliminado.',
        icon: 'info',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#0d6efd',
        timer: 1400,
        timerProgressBar: true
      });
      return;
    }

    const resultado = this.pacienteService.eliminar(id);

    await Swal.fire({
      title: resultado.ok ? 'Paciente eliminado' : 'Error',
      text: resultado.mensaje,
      icon: resultado.ok ? 'success' : 'error',
      confirmButtonText: 'Aceptar',
      confirmButtonColor: resultado.ok ? '#198754' : '#dc3545'
    });

    if (this.pacienteEditandoId() === id) {
      this.cancelarEdicion();
    }
  }

  cancelarEdicion(): void {
    this.modoEdicion.set(false);
    this.pacienteEditandoId.set(null);
    this.limpiarFormulario();
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
}
