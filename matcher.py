# matcher.py
# Offline, free Semantic Matching using Sentence Transformers.
# This runs locally and doesn't require any API key.

from sentence_transformers import SentenceTransformer, util

# We use the all-MiniLM-L6-v2 model — very fast, very small (90MB), but surprisingly good.
# It downloads itself the very first time you run the matcher, then runs completely offline.
print("Loading semantic matching model (this might take a few seconds on first run)...")
model = SentenceTransformer("all-MiniLM-L6-v2")


def split_into_sentences(text: str) -> list[str]:
    """Splits vendor proposal text into manageable blocks for matching."""
    blocks = []
    current_block = []
    
    # We split by double newlines (paragraphs) and single periods
    raw_parts = text.replace(".\n", ". ").split("\n\n")
    
    for part in raw_parts:
        part = part.strip()
        if len(part) > 20: 
            # Sub-split long blocks by periods
            sentences = part.split(". ")
            blocks.extend([s.strip() + "." for s in sentences if len(s.strip()) > 15])
            
    return blocks


def match_requirements(requirements: list[dict], proposal_text: str) -> list[dict]:
    """
    Main matching logic:
      1. Converts requirement sentences to numbers (vectors)
      2. Converts proposal sentences to numbers
      3. Compares them to find the closest meaning
    """
    print("[matcher] Splitting proposal text...")
    proposal_chunks = split_into_sentences(proposal_text)
    
    if not proposal_chunks:
        print("[matcher] Warning: No readable sentences found in proposal.")
        return []

    print(f"[matcher] Embedding {len(proposal_chunks)} chunks from vendor proposal...")
    # Encode the whole proposal right away
    chunk_embeddings = model.encode(proposal_chunks, convert_to_tensor=True)
    
    results = []
    
    for req in requirements:
        req_text = req["requirement"]
        # Encode the specific requirement
        req_emb = model.encode(req_text, convert_to_tensor=True)
        
        # Calculate cosine similarity with every proposal chunk
        cosine_scores = util.cos_sim(req_emb, chunk_embeddings)[0]
        
        # Find the highest scoring chunk
        best_idx = cosine_scores.argmax().item()
        best_score = float(cosine_scores[best_idx])
        best_chunk = proposal_chunks[best_idx]
        
        # Threshold logic: MiniLM tends to give ~0.50 to semi-related text 
        # and >0.65 to strong semantic matches.
        if best_score >= 0.65:
            verdict = "MET"
            confidence = int(best_score * 100)
        elif best_score >= 0.40:
            verdict = "PARTIAL"
            confidence = int(best_score * 100)
        else:
            verdict = "NOT_MET"
            confidence = int(best_score * 100)
            
        # We copy the original dictionary and just add the results
        results.append({
            **req,
            "verdict": verdict,
            "confidence": confidence,
            "best_match_excerpt": best_chunk if verdict != "NOT_MET" else "",
            "similarity_score": round(best_score, 4)
        })
        
    return results