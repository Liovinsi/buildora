import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

// Asked when adding a product while the cart holds another shop's items (one shop per order).
export function CartConflictModal({ open, currentShopName, onKeep, onReplace }) {
  return (
    <Modal
      open={open}
      onClose={onKeep}
      title="Start a new cart?"
      footer={
        <>
          <Button variant="secondary" onClick={onKeep}>Keep current cart</Button>
          <Button onClick={onReplace}>Start new cart</Button>
        </>
      }
    >
      <p className="text-sm text-neutral-600">
        Your cart has items from <span className="font-medium">{currentShopName}</span>. Orders are placed with one shop at a
        time, so adding this item will clear your current cart.
      </p>
    </Modal>
  );
}
