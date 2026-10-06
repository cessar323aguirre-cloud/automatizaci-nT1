(() => {
  const BARBERS = ['barbero 1', 'barbero 2', 'barbero 3'];
  const SERVICE_DEFAULTS = [
    { id:'full', name:'Corte completo', duration:50, price:20000 },
    { id:'simple', name:'Corte simple', duration:30, price:15000 },
    { id:'beard', name:'Corte de barba', duration:20, price:10000 },
    { id:'full-beard', name:'Corte completo + barba', duration:70, price:30000 },
    { id:'simple-beard', name:'Corte simple + barba', duration:50, price:25000 }
  ];
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const localDate = (d=new Date()) => { const x=new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
  const shiftDate = (date, by) => { const d=new Date(`${date}T12:00:00`); d.setDate(d.getDate()+by); return localDate(d); };
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const save = () => { localStorage.setItem('turno-appointments', JSON.stringify(state.appointments)); localStorage.setItem('turno-services', JSON.stringify(state.services)); };
  const today = localDate();
  const state = {
    date: today, barber: 'all', query: '', role: 'owner', view: 'agenda',
    services: read('turno-services', SERVICE_DEFAULTS),
    appointments: read('turno-appointments', null) || [
      {id:'demo-1',date:today,time:'09:00',client:'Santiago Ramírez',serviceId:'full',barber:'barbero 1',phone:'',status:'confirmed',source:'demo'},
      {id:'demo-2',date:today,time:'10:00',client:'Lucía Fernández',serviceId:'simple',barber:'barbero 1',phone:'',status:'confirmed',source:'demo'},
      {id:'demo-3',date:today,time:'11:00',client:'Tomás Benítez',serviceId:'beard',barber:'barbero 2',phone:'',status:'confirmed',source:'demo'},
      {id:'demo-4',date:today,time:'16:30',client:'Camila Acosta',serviceId:'full-beard',barber:'barbero 3',phone:'',status:'confirmed',source:'demo'}
    ]
  };
  const fmtPrice = n => '$' + Number(n||0).toLocaleString('es-AR');
  const fmtDate = (value, opts={weekday:'long', day:'numeric', month:'long'}) => new Intl.DateTimeFormat('es-AR',opts).format(new Date(`${value}T12:00:00`));
  const service = id => state.services.find(s=>s.id===id) || {name:'Servicio eliminado',duration:30,price:0};
  const minutes = t => {const [h,m]=t.split(':').map(Number);return h*60+m;};
  const fromMinutes = n => `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let toastTimer;
  function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}
  function dayAppointments(date=state.date){return state.appointments.filter(a=>a.date===date&&a.status!=='cancelled').sort((a,b)=>a.time.localeCompare(b.time));}
  function render(){renderAgenda();renderServices();renderServiceOptions();$('#pageName').textContent=state.view==='agenda'?'Agenda':'Servicios';$('#agendaView').classList.toggle('active',state.view==='agenda');$('#servicesView').classList.toggle('active',state.view==='services');$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));document.body.classList.toggle('viewer',state.role==='viewer');$('#navCount').textContent=dayAppointments(today).length;}
  function renderAgenda(){
    const appts=dayAppointments().filter(a=>(state.barber==='all'||a.barber===state.barber)&&(!state.query||a.client.toLowerCase().includes(state.query.toLowerCase())||service(a.serviceId).name.toLowerCase().includes(state.query.toLowerCase())));
    const dateLong=fmtDate(state.date);$('#dateLabel').textContent=dateLong.charAt(0).toUpperCase()+dateLong.slice(1);$('#scheduleDate').textContent=fmtDate(state.date,{day:'numeric',month:'long',year:'numeric'});$('#todayLabel').textContent=state.date===today?'AGENDA DEL DÍA':'AGENDA · '+fmtDate(state.date,{day:'numeric',month:'long'}).toUpperCase();
    $('#statAppointments').textContent=dayAppointments().length;$('#allCount').textContent=dayAppointments().length;$('#statRevenue').textContent=fmtPrice(dayAppointments().reduce((sum,a)=>sum+Number(service(a.serviceId).price),0));
    const upcoming=dayAppointments().find(a=>a.time>=new Date().toTimeString().slice(0,5));$('#statNext').textContent=upcoming?upcoming.time:'—';$('#statNextMeta').textContent=upcoming?`${upcoming.client} · ${barberLabel(upcoming.barber)}`:'No hay próximos turnos';
    const body=$('#scheduleBody'), empty=$('#emptyState');
    if(!appts.length){body.innerHTML='';empty.classList.remove('hidden');} else {empty.classList.add('hidden');const barbers=state.barber==='all'?BARBERS:[state.barber];body.innerHTML=barbers.map(b=>{const list=appts.filter(a=>a.barber===b);return `<div class="barber-section"><div class="barber-name"><i class="barber-dot ${barberColor(b)}"></i>${barberLabel(b)}</div><div class="appointment-lane">${list.length?list.map(a=>appointmentCard(a)).join(''):'<span class="lane-empty">Sin turnos asignados</span>'}</div></div>`;}).join('');}
    $('#datePicker').value=state.date;
  }
  function barberLabel(b){return b.replace('barbero','Barbero');}
  function barberColor(b){return b.endsWith('1')?'dot-lilac':b.endsWith('2')?'dot-orange':'dot-green';}
  function appointmentCard(a){const sv=service(a.serviceId),tone=a.barber.endsWith('2')?'orange-card':a.barber.endsWith('3')?'green-card':'';return `<article class="appointment-card ${tone}"><span class="appointment-time">${esc(a.time)}</span><div class="appointment-info"><b>${esc(a.client)}</b><small>${esc(sv.name)} · ${sv.duration} min</small></div>${state.role==='owner'?`<button class="appointment-menu" data-delete-appointment="${esc(a.id)}" title="Quitar turno" aria-label="Quitar turno">···</button>`:''}</article>`;}
  function renderServices(){const list=$('#serviceList');list.innerHTML=state.services.map(s=>`<article class="service-row"><span class="service-symbol">✂</span><div class="service-details"><b>${esc(s.name)}</b><small>${s.duration} minutos</small></div><span class="service-price">${fmtPrice(s.price)}</span>${state.role==='owner'?`<button class="service-edit" data-edit-service="${esc(s.id)}">Editar</button><button class="service-delete" data-delete-service="${esc(s.id)}" title="Eliminar servicio" aria-label="Eliminar ${esc(s.name)}">×</button>`:''}</article>`).join('');$('#serviceTotal').textContent=`${state.services.length} servicios`;}
  function renderServiceOptions(){const select=$('#bookingService');if(!select)return;const previous=select.value;select.innerHTML=state.services.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} · ${s.duration} min · ${fmtPrice(s.price)}</option>`).join('');if(state.services.some(s=>s.id===previous))select.value=previous;renderTimeOptions();}
  function opens(date){const weekday=new Date(`${date}T12:00:00`).getDay();return weekday===0?[]:weekday===6?[[420,780]]:[[420,780],[960,1140]];}
  function assignedSlots(date, serviceId){const duration=Number(service(serviceId).duration)||30;const output=[];for(let start=420;start+duration<=1140;start+=30){const allowed=opens(date).some(([o,c])=>start>=o&&start+duration<=c);if(!allowed)continue;for(const b of BARBERS){const list=state.appointments.filter(a=>a.date===date&&a.barber===b&&a.status!=='cancelled').sort((a,z)=>a.time.localeCompare(z.time));const proposed={time:fromMinutes(start),serviceId};const trial=[...list,proposed].sort((a,z)=>a.time.localeCompare(z.time));let ok=true,streak=0,previousEnd=-1;for(const a of trial){const mins=minutes(a.time),end=mins+(Number(service(a.serviceId).duration)||duration);if(mins<previousEnd){ok=false;break;}if(previousEnd>=0&&mins>previousEnd){streak=0;}if(streak>=2&&mins<previousEnd+15){ok=false;break;}streak++;previousEnd=end;if(streak===2){previousEnd=end+15;streak=0;}}if(ok){output.push({time:fromMinutes(start),barber:b});break;}}
    }
    return output;
  }
  function renderTimeOptions(){const date=$('#bookingDate')?.value||state.date, id=$('#bookingService')?.value||state.services[0]?.id;const select=$('#bookingTime');if(!select)return;const slots=id?assignedSlots(date,id):[];select.innerHTML=slots.length?slots.map(s=>`<option value="${s.time}" data-barber="${s.barber}">${s.time} · ${barberLabel(s.barber)} disponible</option>`).join(''):'<option value="">No hay horarios disponibles</option>';select.disabled=!slots.length;}
  function openDialog(id){const d=$('#'+id);if(d?.showModal)d.showModal();else d?.setAttribute('open','');}
  function closeDialog(id){const d=$('#'+id);d?.close?.();d?.removeAttribute('open');}
  function openAppointment(){if(state.role==='viewer')return;$('#appointmentForm').reset();$('#bookingDate').value=state.date;$('#bookingMessage').textContent='';renderServiceOptions();openDialog('appointmentDialog');}
  function openService(s=null){if(state.role==='viewer')return;const f=$('#serviceForm');f.reset();f.elements.id.value=s?.id||'';f.elements.name.value=s?.name||'';f.elements.duration.value=String(s?.duration||30);f.elements.price.value=s?.price??'';$('#serviceDialogTitle').textContent=s?'Editar servicio':'Agregar servicio';openDialog('serviceDialog');}
  function downloadCsv(){const rows=dayAppointments().map(a=>[a.time,a.client,service(a.serviceId).name,barberLabel(a.barber),a.phone||'',fmtPrice(service(a.serviceId).price)]);const csv=[['Horario','Cliente','Servicio','Barbero','Teléfono','Precio'],...rows].map(r=>r.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`agenda-${state.date}.csv`;a.click();URL.revokeObjectURL(url);toast('Agenda descargada en formato CSV.');}
  $$('.nav-item').forEach(b=>b.addEventListener('click',()=>{state.view=b.dataset.view;render();}));
  $('#roleSelect').addEventListener('change',e=>{state.role=e.target.value;render();toast(state.role==='viewer'?'Vista de solo lectura':'Vista del dueño');});
  $('#helpButton').addEventListener('click',()=>openDialog('infoDialog'));
  $('#newAppointment').addEventListener('click',openAppointment);$('#emptyNew').addEventListener('click',openAppointment);
  $('#addService').addEventListener('click',()=>openService());
  $('#prevDay').addEventListener('click',()=>{state.date=shiftDate(state.date,-1);render();});$('#nextDay').addEventListener('click',()=>{state.date=shiftDate(state.date,1);render();});$('#todayButton').addEventListener('click',()=>{state.date=today;render();});$('#datePickerButton').addEventListener('click',()=>$('#datePicker').showPicker?.());$('#datePicker').addEventListener('change',e=>{if(e.target.value){state.date=e.target.value;render();}});
  $$('.barber-tab').forEach(b=>b.addEventListener('click',()=>{state.barber=b.dataset.barber;$$('.barber-tab').forEach(t=>t.classList.toggle('active',t===b));renderAgenda();}));
  $('#searchInput').addEventListener('input',e=>{state.query=e.target.value;renderAgenda();});$('#exportButton').addEventListener('click',downloadCsv);$('#printButton').addEventListener('click',()=>window.print());
  $('#bookingService').addEventListener('change',renderTimeOptions);$('#bookingDate').addEventListener('change',renderTimeOptions);
  $('#appointmentForm').addEventListener('submit',e=>{e.preventDefault();const f=e.currentTarget,data=new FormData(f),slot=$('#bookingTime').selectedOptions[0],date=data.get('date'),time=data.get('time'),serviceId=data.get('service');if(!time){$('#bookingMessage').textContent='Elegí un horario disponible.';return;}const barber=slot?.dataset.barber;if(!barber){$('#bookingMessage').textContent='Ese horario ya no está disponible. Elegí otro.';renderTimeOptions();return;}state.appointments.push({id:crypto.randomUUID?.()||String(Date.now()),date,time,client:data.get('client').trim(),serviceId,barber,phone:data.get('phone').trim(),status:'confirmed',source:'manual'});save();state.date=date;state.barber='all';render();closeDialog('appointmentDialog');toast(`Turno confirmado para ${time} · ${barberLabel(barber)}.`);});
  $('#serviceForm').addEventListener('submit',e=>{e.preventDefault();const f=e.currentTarget,d=new FormData(f),id=d.get('id')||`service-${Date.now()}`,item={id,name:d.get('name').trim(),duration:Number(d.get('duration')),price:Number(d.get('price'))};const i=state.services.findIndex(s=>s.id===id);if(i<0)state.services.push(item);else state.services[i]=item;save();render();closeDialog('serviceDialog');toast('Servicio guardado.');});
  document.addEventListener('click',e=>{const close=e.target.closest('[data-close]');if(close){closeDialog(close.dataset.close);return;}const edit=e.target.closest('[data-edit-service]');if(edit){openService(state.services.find(s=>s.id===edit.dataset.editService));return;}const del=e.target.closest('[data-delete-service]');if(del){const s=state.services.find(x=>x.id===del.dataset.deleteService);if(s&&confirm(`¿Eliminar “${s.name}” del menú?`)){state.services=state.services.filter(x=>x.id!==s.id);save();render();toast('Servicio eliminado.');}return;}const appt=e.target.closest('[data-delete-appointment]');if(appt){const a=state.appointments.find(x=>x.id===appt.dataset.deleteAppointment);if(a&&confirm(`¿Quitar el turno de ${a.client}?`)){state.appointments=state.appointments.filter(x=>x.id!==a.id);save();render();toast('Turno quitado de la agenda.');}}});
  $$('.modal').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)closeDialog(d.id);}));
  render();
})();