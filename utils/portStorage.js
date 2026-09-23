const fs = require('fs');
const path = require('path');
const { getUser, saveUser } = require('./storage');
const { clampResources } = require('./helpers');
const OFFERS_FILE = path.join(__dirname, '../offers.json');

function readOffers() {
    if (!fs.existsSync(OFFERS_FILE)) {
        fs.writeFileSync(OFFERS_FILE, JSON.stringify({ offers: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(OFFERS_FILE, 'utf8'));
}
function writeOffers(data) {
    fs.writeFileSync(OFFERS_FILE, JSON.stringify(data, null, 2));
}
function createOffer(sellerId, resource, amount, pricePerUnit, currency) {
    const db = readOffers();
    const id = `offer_${Date.now()}_${Math.random().toString(36).substring(2,6)}`;
    const offer = { id, sellerId, resource, amount, pricePerUnit, totalPrice: amount * pricePerUnit, currency, createdAt: Date.now(), expiresAt: Date.now() + 172800000, status: 'active' };
    db.offers.push(offer);
    writeOffers(db);
    return offer;
}
function getActiveOffers(limit = 10, offset = 0) {
    const db = readOffers();
    let offers = db.offers.filter(o => o.status === 'active' && o.expiresAt > Date.now());
    offers.sort((a,b) => a.createdAt - b.createdAt);
    return offers.slice(offset, offset + limit);
}
function getOfferById(id) {
    const db = readOffers();
    return db.offers.find(o => o.id === id);
}
function buyOffer(offerId, buyerId) {
    const db = readOffers();
    const offer = db.offers.find(o => o.id === offerId);
    if (!offer) return { error: '❌ Предложение не найдено.' };
    if (offer.status !== 'active') return { error: '❌ Это предложение уже неактивно.' };
    if (offer.expiresAt < Date.now()) { offer.status = 'expired'; writeOffers(db); return { error: '❌ Предложение истекло.' }; }
    if (offer.sellerId === buyerId) return { error: '❌ Нельзя купить свой лот.' };
    return { success: true, offer };
}
function cancelOffer(offerId, sellerId) {
    const db = readOffers();
    const offer = db.offers.find(o => o.id === offerId);
    if (!offer) return { error: '❌ Предложение не найдено.' };
    if (offer.sellerId !== sellerId) return { error: '❌ Это не твой лот.' };
    if (offer.status !== 'active') return { error: '❌ Это предложение уже неактивно.' };
    offer.status = 'cancelled';
    writeOffers(db);
    return { success: true };
}
function cleanExpiredOffers() {
    const db = readOffers();
    const now = Date.now();
    let changed = false;

    db.offers = db.offers.filter(offer => {
        if (offer.status !== 'active' || offer.expiresAt >= now) return true;

        const seller = getUser(offer.sellerId);
        if (seller) {
            seller[offer.resource] = (Number(seller[offer.resource]) || 0) + offer.amount;
            clampResources(seller);
            saveUser(offer.sellerId, seller);
        }

        changed = true;
        return false;
    });

    if (changed) writeOffers(db);
}
module.exports = { readOffers, writeOffers, createOffer, getActiveOffers, getOfferById, buyOffer, cancelOffer,cleanExpiredOffers };