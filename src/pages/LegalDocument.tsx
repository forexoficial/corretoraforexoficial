import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface LegalDocument {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string | null;
  icon: string;
  is_active: boolean;
  updated_at: string;
}

export default function LegalDocument() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocument();
  }, [slug]);

  const fetchDocument = async () => {
    if (!slug) {
      setError("Document not found");
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("legal_documents")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (fetchError) throw fetchError;
      
      if (!data) {
        setError("Document not found");
      } else {
        setDocument(data);
      }
    } catch (err: any) {
      setError(err.message || "Error loading document");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-xl font-semibold text-foreground">
          {t("document_not_found", "Document not found")}
        </h1>
        <p className="text-muted-foreground text-center">
          {t("document_not_found_desc", "The requested document does not exist or is not available.")}
        </p>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("go_back", "Go Back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">
              {document.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t("last_updated", "Last updated")}: {new Date(document.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <ScrollArea className="h-[calc(100vh-73px)]">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {document.content ? (
              <div 
                dangerouslySetInnerHTML={{ __html: document.content }}
                className="legal-content"
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("no_content", "No content available for this document.")}</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Styles for legal content */}
      <style>{`
        .legal-content h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 1rem;
          margin-top: 2rem;
          color: hsl(var(--foreground));
        }
        .legal-content h2 {
          font-size: 1.375rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
          margin-top: 1.5rem;
          color: hsl(var(--foreground));
        }
        .legal-content h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          margin-top: 1.25rem;
          color: hsl(var(--foreground));
        }
        .legal-content p {
          margin-bottom: 1rem;
          line-height: 1.7;
          color: hsl(var(--muted-foreground));
        }
        .legal-content ul, .legal-content ol {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
          color: hsl(var(--muted-foreground));
        }
        .legal-content li {
          margin-bottom: 0.5rem;
          line-height: 1.6;
        }
        .legal-content strong {
          color: hsl(var(--foreground));
          font-weight: 600;
        }
        .legal-content a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
        .legal-content blockquote {
          border-left: 3px solid hsl(var(--primary));
          padding-left: 1rem;
          margin: 1.5rem 0;
          font-style: italic;
          color: hsl(var(--muted-foreground));
        }
        .legal-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
        }
        .legal-content th, .legal-content td {
          border: 1px solid hsl(var(--border));
          padding: 0.75rem;
          text-align: left;
        }
        .legal-content th {
          background: hsl(var(--muted));
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
