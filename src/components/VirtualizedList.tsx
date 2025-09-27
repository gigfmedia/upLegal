import * as React from 'react';

interface VirtualizedListProps {
  height: number;
  width: number;
  itemCount: number;
  itemSize: number;
  itemData: any;
  children: React.ReactElement;
  className?: string;
}

const VirtualizedList: React.FC<VirtualizedListProps> = ({
  children,
  ...props
}) => {
  const [ListComponent, setListComponent] = React.useState<React.ComponentType<any> | null>(null);
  
  React.useEffect(() => {
    let isMounted = true;
    
    const loadComponent = async () => {
      try {
        const module = await import('react-window');
        if (isMounted) {
          setListComponent(() => module.FixedSizeList);
        }
      } catch (error) {
        console.error('Failed to load react-window:', error);
      }
    };
    
    loadComponent();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  if (!ListComponent) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return React.createElement(ListComponent, props, children);
};

export default VirtualizedList;
