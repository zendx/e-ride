import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { createSupportTicket, listSupportMessages, listSupportTickets, reportRiderIssue, sendSupportMessage, simulateSupportReply } from "../lib/api";
import { isAuthOrRoleError, toApiErrorMessage } from "../lib/api-errors";
import { NoticeBanner } from "../components/notice-banner";
import { AppRole } from "../types/auth";

type HelpCenterScreenProps = {
  accessToken: string;
  onBack: () => void;
  onAuthError?: () => void;
  role?: AppRole;
};

const FAQS = [
  { q: "How do I cancel a ride?", a: "Open your trip card and tap Cancel Trip before pickup." },
  { q: "How do refunds work?", a: "Refunds are processed after support review for eligible cases." },
  { q: "How do I contact support?", a: "Use the issue form below to submit a ticket instantly." }
];

export function HelpCenterScreen({ accessToken, onBack, onAuthError, role }: HelpCenterScreenProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<{
    id: string;
    subject: string;
    priority: string;
    status: string;
    createdAt: string;
  }[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [messages, setMessages] = useState<{ id: string; direction: string; body: string; createdAt: string }[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [reportType, setReportType] = useState<"driver_report" | "failed_transaction" | "dispute">("driver_report");
  const [reportSubject, setReportSubject] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportTripId, setReportTripId] = useState("");
  const [reportDriverId, setReportDriverId] = useState("");
  const [reportPaymentId, setReportPaymentId] = useState("");
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const handleApiError = useCallback((err: unknown, fallback: string) => {
    if (isAuthOrRoleError(err)) {
      onAuthError?.();
      return "Session access issue detected. Open Profile tab to switch role or log in again.";
    }
    return toApiErrorMessage(err, fallback);
  }, [onAuthError]);

  const refreshTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const response = await listSupportTickets(accessToken);
      const rows = (response?.data?.tickets ?? []) as {
        id: string;
        subject: string;
        priority: string;
        status: string;
        createdAt: string;
      }[];
      setTickets(rows);
    } catch (err) {
      setError(handleApiError(err, "Failed to load support tickets."));
    } finally {
      setLoadingTickets(false);
    }
  }, [accessToken, handleApiError]);

  const openTicket = useCallback(async (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setLoadingMessages(true);
    try {
      const response = await listSupportMessages(accessToken, ticketId);
      const rows = (response?.data?.messages ?? []) as { id: string; direction: string; body: string; createdAt: string }[];
      setMessages(rows);
    } catch (err) {
      setError(handleApiError(err, "Failed to load ticket messages."));
    } finally {
      setLoadingMessages(false);
    }
  }, [accessToken, handleApiError]);

  useEffect(() => {
    void refreshTickets();
  }, [refreshTickets]);

  useEffect(() => {
    const interval = setInterval(() => {
      void refreshTickets();
    }, 12000);
    return () => clearInterval(interval);
  }, [refreshTickets]);

  useEffect(() => {
    if (!selectedTicketId) return;
    const interval = setInterval(() => {
      void openTicket(selectedTicketId);
    }, 6000);
    return () => clearInterval(interval);
  }, [openTicket, selectedTicketId]);

  async function submitIssue() {
    if (!subject.trim() || !body.trim()) {
      setError("Subject and message are required.");
      return;
    }

    setSubmitting(true);
    setError("");
    setResult("");
    try {
      const response = await createSupportTicket(accessToken, {
        subject: subject.trim(),
        body: body.trim(),
        priority
      });
      setResult(`Ticket submitted (${response?.data?.id ?? "created"}).`);
      setSubject("");
      setBody("");
      await refreshTickets();
    } catch (err) {
      setError(handleApiError(err, "Failed to submit ticket."));
    } finally {
      setSubmitting(false);
    }
  }

  async function postMessage() {
    if (!selectedTicketId || !messageBody.trim()) return;
    try {
      await sendSupportMessage(accessToken, selectedTicketId, messageBody.trim());
      setMessageBody("");
      await openTicket(selectedTicketId);
    } catch (err) {
      setError(handleApiError(err, "Failed to send message."));
    }
  }

  async function triggerSimulatedReply() {
    if (!selectedTicketId) return;
    try {
      await simulateSupportReply(accessToken, selectedTicketId);
      await openTicket(selectedTicketId);
    } catch (err) {
      setError(handleApiError(err, "Failed to simulate support reply."));
    }
  }

  async function submitRiderReport() {
    if (!reportSubject.trim() || !reportDetails.trim()) {
      setError("Report subject and details are required.");
      return;
    }
    setError("");
    setResult("");
    try {
      const response = await reportRiderIssue(accessToken, {
        reportType,
        subject: reportSubject.trim(),
        details: reportDetails.trim(),
        tripId: reportTripId.trim() || undefined,
        driverId: reportDriverId.trim() || undefined,
        paymentTransactionId: reportPaymentId.trim() || undefined
      });
      setResult(`Report submitted to tenant (${response?.data?.ticket?.id ?? "created"}).`);
      setReportSubject("");
      setReportDetails("");
      setReportTripId("");
      setReportDriverId("");
      setReportPaymentId("");
      await refreshTickets();
    } catch (err) {
      setError(handleApiError(err, "Failed to submit rider report."));
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Help Center</Text>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>FAQs</Text>
        {FAQS.map((item) => (
          <View key={item.q} style={styles.faqItem}>
            <Text style={styles.question}>{item.q}</Text>
            <Text style={styles.answer}>{item.a}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Report an Issue</Text>
        <TextInput style={styles.input} value={subject} onChangeText={setSubject} placeholder="Subject" />
        <TextInput
          style={[styles.input, styles.textArea]}
          value={body}
          onChangeText={setBody}
          placeholder="Describe the issue"
          multiline
        />
        <View style={styles.row}>
          {(["low", "normal", "high"] as const).map((level) => (
            <TouchableOpacity key={level} style={[styles.pill, priority === level && styles.pillActive]} onPress={() => setPriority(level)}>
              <Text style={priority === level ? styles.pillTextActive : styles.pillText}>{level}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.button} onPress={() => void submitIssue()} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? "Submitting..." : "Submit Ticket"}</Text>
        </TouchableOpacity>
        <NoticeBanner tone="success" message={result} />
        <NoticeBanner tone="error" message={error} />
      </View>

      {role === "passenger" ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Report to Tenant (Rider)</Text>
          <View style={styles.row}>
            {([
              { key: "driver_report", label: "Driver Report" },
              { key: "failed_transaction", label: "Failed Transaction" },
              { key: "dispute", label: "Dispute" }
            ] as const).map((item) => (
              <TouchableOpacity key={item.key} style={[styles.pill, reportType === item.key && styles.pillActive]} onPress={() => setReportType(item.key)}>
                <Text style={reportType === item.key ? styles.pillTextActive : styles.pillText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.input} value={reportSubject} onChangeText={setReportSubject} placeholder="Report subject" />
          <TextInput style={[styles.input, styles.textArea]} value={reportDetails} onChangeText={setReportDetails} placeholder="What happened?" multiline />
          <TextInput style={styles.input} value={reportTripId} onChangeText={setReportTripId} placeholder="Trip ID (optional)" />
          <TextInput style={styles.input} value={reportDriverId} onChangeText={setReportDriverId} placeholder="Driver ID (optional)" />
          <TextInput style={styles.input} value={reportPaymentId} onChangeText={setReportPaymentId} placeholder="Payment transaction ID (optional)" />
          <TouchableOpacity style={styles.button} onPress={() => void submitRiderReport()}>
            <Text style={styles.buttonText}>Submit Report</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>My Issues</Text>
        <TouchableOpacity style={styles.button} onPress={() => void refreshTickets()}>
          <Text style={styles.buttonText}>{loadingTickets ? "Refreshing..." : "Refresh Tickets"}</Text>
        </TouchableOpacity>
        {tickets.map((ticket) => (
          <TouchableOpacity key={ticket.id} style={styles.faqItem} onPress={() => void openTicket(ticket.id)}>
            <Text style={styles.question}>{ticket.subject}</Text>
            <Text style={styles.answer}>{ticket.priority} | {ticket.status}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedTicketId ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ticket Chat</Text>
          {loadingMessages ? <Text style={styles.answer}>Loading messages...</Text> : null}
          {messages.map((message) => (
            <View key={message.id} style={styles.faqItem}>
              <Text style={styles.question}>{message.direction}</Text>
              <Text style={styles.answer}>{message.body}</Text>
            </View>
          ))}
          <TextInput
            style={[styles.input, styles.textArea]}
            value={messageBody}
            onChangeText={setMessageBody}
            placeholder="Type a message"
            multiline
          />
          <TouchableOpacity style={styles.button} onPress={() => void postMessage()}>
            <Text style={styles.buttonText}>Send Message</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => void triggerSimulatedReply()}>
            <Text style={styles.buttonText}>Simulate Support Reply</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    fontSize: 22,
    fontWeight: "700"
  },
  backBtn: {
    borderWidth: 1,
    borderColor: "#d8e1ee",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  backText: {
    fontWeight: "700",
    color: "#0f1f33"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    gap: 10
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700"
  },
  faqItem: {
    borderWidth: 1,
    borderColor: "#d8e1ee",
    borderRadius: 10,
    padding: 10,
    gap: 4
  },
  question: {
    fontWeight: "700",
    color: "#0f1f33"
  },
  answer: {
    color: "#5a6f8a"
  },
  input: {
    borderWidth: 1,
    borderColor: "#d8e1ee",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: 12
  },
  row: {
    flexDirection: "row",
    gap: 8
  },
  pill: {
    borderWidth: 1,
    borderColor: "#d8e1ee",
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  pillActive: {
    backgroundColor: "#0e7490",
    borderColor: "#0e7490"
  },
  pillText: {
    color: "#0f1f33",
    textTransform: "capitalize"
  },
  pillTextActive: {
    color: "#fff",
    textTransform: "capitalize"
  },
  button: {
    backgroundColor: "#0e7490",
    borderRadius: 10,
    height: 44,
    justifyContent: "center",
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700"
  },
});
