from sentence_transformers import SentenceTransformer, util

model = SentenceTransformer("all-MiniLM-L6-v2")


def split_into_sentences(text: str) -> list[str]:
    blocks = []
    raw_parts = text.replace(".\n", ". ").split("\n\n")

    for part in raw_parts:
        part = part.strip()
        if len(part) > 20:
            sentences = part.split(". ")
            blocks.extend([s.strip() + "." for s in sentences if len(s.strip()) > 15])

    return blocks


def match_requirements(requirements: list[dict], proposal_text: str) -> list[dict]:
    proposal_chunks = split_into_sentences(proposal_text)

    if not proposal_chunks:
        return []

    chunk_embeddings = model.encode(proposal_chunks, convert_to_tensor=True)
    results = []

    for req in requirements:
        req_emb = model.encode(req["requirement"], convert_to_tensor=True)
        cosine_scores = util.cos_sim(req_emb, chunk_embeddings)[0]

        best_idx = cosine_scores.argmax().item()
        best_score = float(cosine_scores[best_idx])
        best_chunk = proposal_chunks[best_idx]

        if best_score >= 0.65:
            verdict = "MET"
        elif best_score >= 0.40:
            verdict = "PARTIAL"
        else:
            verdict = "NOT_MET"

        results.append({
            **req,
            "verdict": verdict,
            "confidence": int(best_score * 100),
            "best_match_excerpt": best_chunk if verdict != "NOT_MET" else "",
            "similarity_score": round(best_score, 4)
        })

    return results