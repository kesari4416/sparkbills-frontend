import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, fmtINR, formatApiError } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Users, Stethoscope, BedDouble, Plus, Search, Receipt } from "lucide-react";

export default function Hospital() {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [openP, setOpenP] = useState(false);
  const [openD, setOpenD] = useState(false);
  const [openA, setOpenA] = useState(false);
  const [openR, setOpenR] = useState(false);
  const [pForm, setPForm] = useState({ name: "", gender: "male", age: 0, phone: "", address: "", insurance_provider: "" });
  const [dForm, setDForm] = useState({ name: "", specialization: "General Physician", consultation_fee: 500 });
  const [aForm, setAForm] = useState({ patient_id: "", doctor_id: "", scheduled_at: "", reason: "" });
  const [rForm, setRForm] = useState({ name: "", room_type: "General", daily_charge: 1000 });
  const [search, setSearch] = useState("");
  const nav = useNavigate();

  const loadAll = async () => {
    const [p, d, a, r] = await Promise.all([
      api.get("/patients", { params: { search } }),
      api.get("/doctors"), api.get("/appointments"), api.get("/rooms"),
    ]);
    setPatients(p.data); setDoctors(d.data); setAppointments(a.data); setRooms(r.data);
  };
  useEffect(() => { loadAll(); }, []);
  useEffect(() => { const t = setTimeout(() => api.get("/patients", { params: { search } }).then((r) => setPatients(r.data)), 250); return () => clearTimeout(t); }, [search]);

  const savePatient = async () => { try { await api.post("/patients", pForm); toast.success("Patient added"); setOpenP(false); setPForm({ name: "", gender: "male", age: 0, phone: "", address: "", insurance_provider: "" }); loadAll(); } catch (e) { toast.error(formatApiError(e)); } };
  const saveDoctor = async () => { try { await api.post("/doctors", dForm); toast.success("Doctor added"); setOpenD(false); loadAll(); } catch (e) { toast.error(formatApiError(e)); } };
  const saveAppointment = async () => { try { await api.post("/appointments", aForm); toast.success("Appointment created"); setOpenA(false); loadAll(); } catch (e) { toast.error(formatApiError(e)); } };
  const saveRoom = async () => { try { await api.post("/rooms", rForm); toast.success("Room added"); setOpenR(false); loadAll(); } catch (e) { toast.error(formatApiError(e)); } };

  const billConsult = async (p, d) => {
    const payload = {
      doc_type: "invoice", industry: "hospital",
      customer_id: null, customer_name: p.name, customer_phone: p.phone,
      patient_id: p.id, doctor_id: d.id,
      items: [{ name: `Consultation — Dr. ${d.name} (${d.specialization})`, quantity: 1, rate: d.consultation_fee, gst_rate: 0, discount_pct: 0, hsn_sac: "9993", unit: "SESSION" }],
      round_off: true,
    };
    const { data } = await api.post("/invoices", payload);
    toast.success(`Consultation billed: ${data.number}`);
    nav(`/app/invoices/${data.id}`);
  };

  return (
    <div className="p-6 lg:p-8" data-testid="hospital-page">
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.3em] text-primary">Hospital / Clinic</div>
        <h1 className="font-heading text-3xl font-bold tracking-tight mt-1">Patient Management</h1>
      </div>

      <Tabs defaultValue="patients">
        <TabsList className="rounded-sm">
          <TabsTrigger value="patients" data-testid="tab-patients"><Users className="w-3.5 h-3.5 mr-2" />Patients</TabsTrigger>
          <TabsTrigger value="doctors" data-testid="tab-doctors"><Stethoscope className="w-3.5 h-3.5 mr-2" />Doctors</TabsTrigger>
          <TabsTrigger value="appointments"><Receipt className="w-3.5 h-3.5 mr-2" />Appointments</TabsTrigger>
          <TabsTrigger value="rooms"><BedDouble className="w-3.5 h-3.5 mr-2" />Rooms & Beds</TabsTrigger>
        </TabsList>

        <TabsContent value="patients" className="mt-4">
          <Card className="rounded-sm p-4 mb-3 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input placeholder="Search name / phone / UHID" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-sm" data-testid="patient-search" />
            </div>
            <div className="flex-1" />
            <Dialog open={openP} onOpenChange={setOpenP}>
              <DialogTrigger asChild><Button className="rounded-sm gap-2" data-testid="new-patient-btn"><Plus className="w-4 h-4" />Register Patient</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Patient</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>Name</Label><Input value={pForm.name} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} className="rounded-sm mt-1" data-testid="p-name" /></div>
                  <div>
                    <Label>Gender</Label>
                    <Select value={pForm.gender} onValueChange={(v) => setPForm({ ...pForm, gender: v })}>
                      <SelectTrigger className="rounded-sm mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Age</Label><Input type="number" value={pForm.age} onChange={(e) => setPForm({ ...pForm, age: parseInt(e.target.value) || 0 })} className="rounded-sm mt-1" /></div>
                  <div className="col-span-2"><Label>Phone</Label><Input value={pForm.phone} onChange={(e) => setPForm({ ...pForm, phone: e.target.value })} className="rounded-sm mt-1" /></div>
                  <div className="col-span-2"><Label>Address</Label><Input value={pForm.address} onChange={(e) => setPForm({ ...pForm, address: e.target.value })} className="rounded-sm mt-1" /></div>
                  <div className="col-span-2"><Label>Insurance Provider</Label><Input value={pForm.insurance_provider} onChange={(e) => setPForm({ ...pForm, insurance_provider: e.target.value })} className="rounded-sm mt-1" placeholder="e.g. Star Health" /></div>
                </div>
                <DialogFooter><Button className="rounded-sm" onClick={savePatient} data-testid="save-patient">Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </Card>

          <Card className="rounded-sm overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-[10px] uppercase tracking-widest">UHID</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest">Name</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest">Gender / Age</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest">Phone</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest">Insurance</TableHead>
                <TableHead className="text-right">Consult</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {patients.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.uhid}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="capitalize text-sm">{p.gender} · {p.age}</TableCell>
                    <TableCell>{p.phone || "—"}</TableCell>
                    <TableCell className="text-xs">{p.insurance_provider || "—"}</TableCell>
                    <TableCell className="text-right">
                      {doctors[0] && <Button size="sm" variant="outline" className="rounded-sm text-xs" onClick={() => billConsult(p, doctors[0])} data-testid={`bill-consult-${p.id}`}>Bill Consult</Button>}
                    </TableCell>
                  </TableRow>
                ))}
                {patients.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No patients yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="doctors" className="mt-4">
          <div className="flex justify-end mb-3">
            <Dialog open={openD} onOpenChange={setOpenD}>
              <DialogTrigger asChild><Button className="rounded-sm gap-2" data-testid="new-doctor-btn"><Plus className="w-4 h-4" />Add Doctor</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Doctor</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Name</Label><Input value={dForm.name} onChange={(e) => setDForm({ ...dForm, name: e.target.value })} className="rounded-sm mt-1" /></div>
                  <div><Label>Specialization</Label><Input value={dForm.specialization} onChange={(e) => setDForm({ ...dForm, specialization: e.target.value })} className="rounded-sm mt-1" /></div>
                  <div><Label>Consultation Fee</Label><Input type="number" value={dForm.consultation_fee} onChange={(e) => setDForm({ ...dForm, consultation_fee: parseFloat(e.target.value) || 0 })} className="rounded-sm mt-1" /></div>
                </div>
                <DialogFooter><Button className="rounded-sm" onClick={saveDoctor}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {doctors.map((d) => (
              <Card key={d.id} className="p-4 rounded-sm">
                <Stethoscope className="w-5 h-5 text-primary" strokeWidth={1.5} />
                <div className="mt-3 font-heading font-semibold">{d.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{d.specialization}</div>
                <div className="tabular font-bold text-primary mt-2">{fmtINR(d.consultation_fee)}</div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="mt-4">
          <div className="flex justify-end mb-3">
            <Dialog open={openA} onOpenChange={setOpenA}>
              <DialogTrigger asChild><Button className="rounded-sm gap-2"><Plus className="w-4 h-4" />New Appointment</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Schedule Appointment</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Patient</Label>
                    <Select value={aForm.patient_id} onValueChange={(v) => setAForm({ ...aForm, patient_id: v })}>
                      <SelectTrigger className="rounded-sm mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Doctor</Label>
                    <Select value={aForm.doctor_id} onValueChange={(v) => setAForm({ ...aForm, doctor_id: v })}>
                      <SelectTrigger className="rounded-sm mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} — {d.specialization}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Date & Time</Label><Input type="datetime-local" value={aForm.scheduled_at} onChange={(e) => setAForm({ ...aForm, scheduled_at: e.target.value })} className="rounded-sm mt-1" /></div>
                  <div><Label>Reason</Label><Input value={aForm.reason} onChange={(e) => setAForm({ ...aForm, reason: e.target.value })} className="rounded-sm mt-1" /></div>
                </div>
                <DialogFooter><Button className="rounded-sm" onClick={saveAppointment}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card className="rounded-sm overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-[10px] uppercase tracking-widest">When</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest">Patient</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest">Doctor</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest">Reason</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest">Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {appointments.map((a) => {
                  const p = patients.find((x) => x.id === a.patient_id);
                  const d = doctors.find((x) => x.id === a.doctor_id);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs">{a.scheduled_at?.replace("T", " ").slice(0, 16)}</TableCell>
                      <TableCell>{p?.name || "—"}</TableCell>
                      <TableCell>{d?.name || "—"}</TableCell>
                      <TableCell className="text-xs">{a.reason || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="rounded-sm text-[10px] uppercase">{a.status}</Badge></TableCell>
                    </TableRow>
                  );
                })}
                {appointments.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No appointments yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="rooms" className="mt-4">
          <div className="flex justify-end mb-3">
            <Dialog open={openR} onOpenChange={setOpenR}>
              <DialogTrigger asChild><Button className="rounded-sm gap-2"><Plus className="w-4 h-4" />Add Room</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Room</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Room Name / No.</Label><Input value={rForm.name} onChange={(e) => setRForm({ ...rForm, name: e.target.value })} className="rounded-sm mt-1" /></div>
                  <div><Label>Type</Label>
                    <Select value={rForm.room_type} onValueChange={(v) => setRForm({ ...rForm, room_type: v })}>
                      <SelectTrigger className="rounded-sm mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{["General", "Semi-Private", "Private", "ICU"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Daily Charge (₹)</Label><Input type="number" value={rForm.daily_charge} onChange={(e) => setRForm({ ...rForm, daily_charge: parseFloat(e.target.value) || 0 })} className="rounded-sm mt-1" /></div>
                </div>
                <DialogFooter><Button className="rounded-sm" onClick={saveRoom}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {rooms.map((r) => (
              <Card key={r.id} className={`p-4 rounded-sm ${r.status === "occupied" ? "border-primary" : ""}`}>
                <div className="flex items-start justify-between">
                  <BedDouble className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  <Badge variant="outline" className="rounded-sm text-[10px] uppercase">{r.status}</Badge>
                </div>
                <div className="mt-3 font-heading text-lg font-bold">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.room_type}</div>
                <div className="tabular text-sm font-semibold mt-2">{fmtINR(r.daily_charge)}/day</div>
              </Card>
            ))}
            {rooms.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12">Add rooms and beds to start.</div>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
