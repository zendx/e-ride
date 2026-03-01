import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { createSupportTicket, listSupportMessages, listSupportTickets, sendSupportMessage, simulateSupportReply } from "../lib/api";
import { isAuthOrRoleError, toApiErrorMessage } from "../lib/api-errors";
import { NoticeBanner } from "../components/notice-banner";

type HelpCenterScreenProps = {
  accessToken: string;
  onBack: () => void;
  onAuthError?: () => void;
};

const FAQS = [
  { q: "How do I cancel a ride?", a: "Open your trip card and tap Cancel Trip before pickup." },
  { q: "How do refunds work?", a: "Refunds are processed after support review for eligible cases." },
  { q: "How do I contact support?", a: "Use the issue form below to submit a ticket instantly." }
];

export function HelpCenterScreen({ accessToken, onBack, onAuthError }: HelpCenterScreenProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Array<{
    id: string;
    subject: string;
    priority: string;
    status: string;
    createdAt: string;
  }>>([]);
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [messages, setMessages] = useState<Array<{ id: string; direction: string; body: string; createdAt: string }>>([]);
  const [messageBody, setMessageBody] = useState("");
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  function handleApiError(err: unknown, fallback: string) {
    if (isAuthOrRoleError(err)) {
      onAuthError?.();
      return "Session access issue detected. Open Profile tab to switch role or log in again.";
    }
    return toApiErrorMessage(err, fallback);
  }

  useEffect(() => {
    void refreshTickets();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      void refreshTickets();
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedTicketId) return;
    const interval = setInterval(() => {
      void openTicket(selectedTicketId);
    }, 6000);
    return () => clearInterval(interval);
  }, [selectedTicketId]);

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

  async function refreshTickets() {
    setLoadingTickets(true);
    try {
      const response = await listSupportTickets(accessToken);
      const rows = (response?.data?.tickets ?? []) as Array<{
        id: string;
        subject: string;
        priority: string;
        status: string;
        createdAt: string;
      }>;
      setTickets(rows);
    } catch (err) {
      setError(handleApiError(err, "Failed to load support tickets."));
    } finally {
      setLoadingTickets(false);
    }
  }

  async function openTicket(ticketId: string) {
    setSelectedTicketId(ticketId);
    setLoadingMessages(true);
    try {
      const response = await listSupportMessages(accessToken, ticketId);
      const rows = (response?.data?.messages ?? []) as Array<{ id: string; direction: string; body: string; createdAt: string }>;
      setMessages(rows);
    } catch (err) {
      setError(handleApiError(err, "Failed to load ticket messages."));
    } finally {
      setLoadingMessages(false);
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
